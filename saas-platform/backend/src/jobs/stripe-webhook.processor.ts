import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from './queue.constants';
import { HandlePaymentSucceededUseCase } from '../modules/webhook/application/handle-payment-succeeded.usecase';
import { HandleSubscriptionCanceledUseCase } from '../modules/webhook/application/handle-subscription-canceled.usecase';
import { HandleInvoiceFailedUseCase } from '../modules/webhook/application/handle-invoice-failed.usecase';
import {
    InvoiceFailedEventData,
    PaymentSucceededEventData,
    StripeWebhookJobPayload,
    SubscriptionCanceledEventData,
} from '../modules/webhook/infrastructure/stripe-event.types';

import { PrismaService } from '../shared/prisma/prisma.service';

/**
 * StripeWebhookProcessor — BullMQ processor for the stripe-webhook queue.
 *
 * Responsibilities:
 *  - Receive jobs from the STRIPE_WEBHOOK queue.
 *  - Route to the correct Application UseCase based on job.name.
 *  - NO business logic here — only orchestration.
 *  - IDEMPOTENCY: Ensure each event ID is processed exactly once in DB.
 *
 * Reliability guarantees (via BullMQ):
 *  - Jobs survive process crash (persisted in Redis).
 *  - Automatic retry with backoff on UseCase failure.
 *  - Exactly-once processing via job ID deduplication.
 *
 * Layer contract: delegates ALL business decisions to Application layer.
 */
@Processor(QUEUE_NAMES.STRIPE_WEBHOOK)
export class StripeWebhookProcessor extends WorkerHost {
    private readonly logger = new Logger(StripeWebhookProcessor.name);

    constructor(
        private readonly handlePaymentSucceeded: HandlePaymentSucceededUseCase,
        private readonly handleSubscriptionCanceled: HandleSubscriptionCanceledUseCase,
        private readonly handleInvoiceFailed: HandleInvoiceFailedUseCase,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async process(job: Job<StripeWebhookJobPayload>): Promise<void> {
        const { eventId, eventType } = job.data;
        const startTime = Date.now();

        this.logger.log({
            msg: `Job started`,
            jobId: job.id,
            jobName: job.name,
            eventId,
            eventType,
        });

        // ── 1. Idempotency Check ──────────────────────────────────────────────
        const alreadyProcessed = await this.prisma.processedWebhookEvent.findUnique({
            where: { id: eventId },
        });

        if (alreadyProcessed) {
            this.logger.warn({
                msg: `Duplicate event skipped`,
                eventId,
                processedAt: alreadyProcessed.processedAt,
            });
            return;
        }

        // ── 2. Route to UseCase ────────────────────────────────────────────────
        try {
            switch (job.name) {
                case JOB_NAMES.STRIPE_PAYMENT_SUCCEEDED:
                    await this.handlePaymentSucceeded.execute(
                        job.data.data as PaymentSucceededEventData,
                    );
                    break;

                case JOB_NAMES.STRIPE_SUBSCRIPTION_CANCELED:
                    await this.handleSubscriptionCanceled.execute(
                        job.data.data as SubscriptionCanceledEventData,
                    );
                    break;

                case JOB_NAMES.STRIPE_INVOICE_FAILED:
                    await this.handleInvoiceFailed.execute(
                        job.data.data as InvoiceFailedEventData,
                    );
                    break;

                default:
                    this.logger.warn(`Unknown job: ${job.name}`);
                    return;
            }

            // ── 3. Record success for idempotency ──────────────────────────────────
            await this.prisma.processedWebhookEvent.create({
                data: { id: eventId, type: eventType },
            });

            this.logger.log({
                msg: `Job completed`,
                jobId: job.id,
                durationMs: Date.now() - startTime,
                eventId,
            });
        } catch (error) {
            this.logger.error({
                msg: `Job failed`,
                jobId: job.id,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                eventId,
            });
            throw error; // Let BullMQ handle retry
        }
    }
}
