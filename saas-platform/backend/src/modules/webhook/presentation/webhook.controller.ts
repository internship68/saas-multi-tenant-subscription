import {
    BadRequestException,
    Controller,
    Headers,
    Logger,
    Post,
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

/**
 * WebhookController — Presentation layer.
 *
 * Responsibilities:
 *  1. Receive POST /webhooks/stripe
 *  2. Extract raw body (required for Stripe HMAC signature validation)
 *  3. Delegate signature validation to StripeService (Infrastructure)
 *  4. Push validated event to BullMQ queue immediately
 *  5. Return HTTP 200 to Stripe quickly (Stripe retries if we don't)
 *
 * Layer contract:
 *  - NO business logic here.
 *  - Controller does NOT call UseCases directly — events go through queue.
 *  - This ensures: durability, retry, idempotency via BullMQ.
 *
 * Important: This endpoint must NOT use the global JSON body parser.
 * Configure main.ts with rawBody: true to capture raw Buffer.
 */
@Controller('webhooks')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly stripeService: StripeService,
        @InjectQueue(QUEUE_NAMES.STRIPE_WEBHOOK)
        private readonly stripeWebhookQueue: Queue,
    ) { }

    @Post('stripe')
    async handleStripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ): Promise<{ received: boolean }> {
        // ── 1. Extract raw body ───────────────────────────────────────────────
        const rawBody = req.rawBody;

        if (!rawBody || rawBody.length === 0) {
            this.logger.error(
                'Raw body is empty. Ensure NestFactory.create() is called with { rawBody: true }',
            );
            throw new BadRequestException('Empty request body');
        }

        // ── 2. Validate Stripe signature + parse event ────────────────────────
        let event;
        try {
            event = this.stripeService.validateAndParseEvent(rawBody, signature);
        } catch (error: unknown) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            const reason =
                error instanceof Error ? error.message : 'Signature validation failed';
            this.logger.warn(`Stripe webhook rejected: ${reason}`);
            throw new UnauthorizedException(reason);
        }

        // ── 3. Resolve job name for this event type ───────────────────────────
        const jobName = this.stripeService.resolveJobName(event.type);

        if (!jobName) {
            // Log unhandled event types but still return 200 to Stripe
            this.logger.log(
                `Stripe event type "${event.type}" is not handled — acknowledging without processing.`,
            );
            return { received: true };
        }

        // ── 4. Parse event data into our internal type ────────────────────────
        let parsedData;
        switch (event.type) {
            case STRIPE_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED:
                parsedData = this.stripeService.parsePaymentSucceeded(
                    event.data.object,
                );
                break;

            case STRIPE_EVENT_TYPES.CUSTOMER_SUBSCRIPTION_DELETED:
                parsedData = this.stripeService.parseSubscriptionCanceled(
                    event.data.object,
                );
                break;

            case STRIPE_EVENT_TYPES.INVOICE_PAYMENT_FAILED:
                parsedData = this.stripeService.parseInvoiceFailed(event.data.object);
                break;

            default:
                return { received: true };
        }

        // ── 5. Enqueue to BullMQ (return 200 immediately after this) ─────────
        const jobPayload: StripeWebhookJobPayload = {
            eventId: event.id,
            eventType: event.type,
            data: parsedData,
        };

        await this.stripeWebhookQueue.add(jobName, jobPayload, {
            // Use Stripe event ID as job ID for idempotency
            // BullMQ will reject duplicate job IDs if the same event arrives twice
            jobId: event.id,
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 5000, // Start at 5s, then 10s, 20s, 40s, 80s
            },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
        });

        this.logger.log(
            `Stripe event "${event.type}" (id: ${event.id}) enqueued as job "${jobName}"`,
        );

        // ── 6. Return 200 to Stripe immediately ──────────────────────────────
        return { received: true };
    }
}
