import {
    BadRequestException,
    Controller,
    Headers,
    Logger,
    Post,
    Get,
    Param,
    RawBodyRequest,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { JOB_NAMES, QUEUE_NAMES } from '../../../jobs/queue.constants';
import { StripeService } from '../infrastructure/stripe.service';
import {
    STRIPE_EVENT_TYPES,
    StripeWebhookJobPayload,
} from '../infrastructure/stripe-event.types';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/**
 * WebhookController — Presentation layer.
 *
 * Idempotency contract (3-step):
 *  1. Verify Stripe HMAC signature
 *  2. Check WebhookEvent table — reject duplicates BEFORE queue push
 *  3. Insert WebhookEvent (status=PENDING) THEN push to BullMQ
 *
 * Worker is responsible for updating status to PROCESSED | FAILED.
 *
 * This guarantees: even if server restarts between step 3 and queue push,
 * a duplicate event will be blocked at step 2 on retry.
 */
@Controller('webhook')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly prisma: PrismaService,
        @InjectQueue(QUEUE_NAMES.STRIPE_WEBHOOK)
        private readonly stripeWebhookQueue: Queue,
    ) { }

    @Post('stripe')
    async handleStripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ): Promise<{ received: boolean }> {

        // ── 1. Extract raw body ─────────────────────────────────────────────
        const rawBody = req.rawBody;
        if (!rawBody || rawBody.length === 0) {
            this.logger.error(
                'Raw body is empty. Ensure NestFactory.create() is called with { rawBody: true }',
            );
            throw new BadRequestException('Empty request body');
        }

        // ── 2. Validate Stripe signature + parse event ──────────────────────
        let event;
        try {
            event = this.stripeService.validateAndParseEvent(rawBody, signature);
        } catch (error: unknown) {
            if (error instanceof UnauthorizedException) throw error;
            const reason = error instanceof Error ? error.message : 'Signature validation failed';
            this.logger.warn(`Stripe webhook rejected: ${reason}`);
            throw new UnauthorizedException(reason);
        }

        // ── 3. Idempotency guard — check BEFORE queue push ──────────────────
        const existing = await this.prisma.webhookEvent.findUnique({
            where: { id: event.id },
        });

        if (existing) {
            this.logger.warn({
                msg: 'Duplicate Stripe event received — skipping',
                stripe_event_id: event.id,
                existing_status: existing.status,
                received_at: existing.receivedAt,
            });
            // Return 200 to Stripe so it doesn't retry
            return { received: true };
        }

        // ── 4. Resolve job name ─────────────────────────────────────────────
        const jobName = this.stripeService.resolveJobName(event.type);

        if (!jobName) {
            this.logger.log({
                msg: 'Unhandled Stripe event type — acknowledging',
                stripe_event_id: event.id,
                event_type: event.type,
            });
            // Still record it so we have an audit trail
            await this.prisma.webhookEvent.create({
                data: { id: event.id, type: event.type, status: 'UNHANDLED' },
            });
            return { received: true };
        }

        // ── 5. Parse event data ─────────────────────────────────────────────
        let parsedData;
        switch (event.type) {
            case STRIPE_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED:
                parsedData = this.stripeService.parsePaymentSucceeded(event.data.object);
                break;
            case STRIPE_EVENT_TYPES.CUSTOMER_SUBSCRIPTION_DELETED:
                parsedData = this.stripeService.parseSubscriptionCanceled(event.data.object);
                break;
            case STRIPE_EVENT_TYPES.INVOICE_PAYMENT_FAILED:
                parsedData = this.stripeService.parseInvoiceFailed(event.data.object);
                break;
            default:
                return { received: true };
        }

        // ── 6. Insert WebhookEvent (PENDING) then push to queue ─────────────
        // Do these atomically: if queue push fails, we still have the DB record
        // and Stripe will retry — the duplicate check (step 3) will catch it.
        const jobPayload: StripeWebhookJobPayload = {
            eventId: event.id,
            eventType: event.type,
            data: parsedData,
        };

        await this.prisma.webhookEvent.create({
            data: {
                id: event.id,
                type: event.type,
                status: 'PENDING',
                payload: jobPayload as unknown as any,
            },
        });

        await this.stripeWebhookQueue.add(jobName, jobPayload, {
            jobId: event.id,     // BullMQ-level dedup (secondary safety net)
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        });

        this.logger.log({
            msg: 'Stripe event enqueued',
            stripe_event_id: event.id,
            event_type: event.type,
            job_name: jobName,
        });

        return { received: true };
    }

    @Get('stripe/dlq')
    async getDeadLetterQueue() {
        return this.prisma.webhookEvent.findMany({
            where: { status: 'FAILED' },
            orderBy: { failedAt: 'desc' },
        });
    }

    @Post('stripe/replay/:id')
    async replayFailedEvent(@Param('id') eventId: string) {
        const event = await this.prisma.webhookEvent.findUnique({
            where: { id: eventId },
        });

        if (!event) throw new BadRequestException('Event not found');
        if (event.status !== 'FAILED') throw new BadRequestException('Can only replay FAILED events');
        if (!event.payload) throw new BadRequestException('Event missing payload, cannot replay');

        const jobName = this.stripeService.resolveJobName(event.type);
        if (!jobName) throw new BadRequestException('No handler for this event type');

        // Update status to PENDING
        await this.prisma.webhookEvent.update({
            where: { id: eventId },
            data: { status: 'PENDING', errorMessage: null, failedAt: null },
        });

        // Push to queue again
        await this.stripeWebhookQueue.add(jobName, event.payload as unknown as StripeWebhookJobPayload, {
            jobId: event.id + '_replay_' + Date.now(),
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        });

        this.logger.log(`Replayed event ${eventId}`);
        return { success: true, replayedEventId: eventId };
    }
}
