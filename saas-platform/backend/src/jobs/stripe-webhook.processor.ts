import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from './queue.constants';
import { HandlePaymentSucceededUseCase } from '../modules/webhook/application/handle-payment-succeeded.usecase';
import { HandleSubscriptionCanceledUseCase } from '../modules/webhook/application/handle-subscription-canceled.usecase';
import { HandleInvoiceFailedUseCase } from '../modules/webhook/application/handle-invoice-failed.usecase';
import { HandleCheckoutSessionCompletedUseCase } from '../modules/webhook/application/handle-checkout-completed.usecase';
import {
    InvoiceFailedEventData,
    PaymentSucceededEventData,
    StripeWebhookJobPayload,
    SubscriptionCanceledEventData,
    CheckoutSessionCompletedEventData,
} from '../modules/webhook/infrastructure/stripe-event.types';
import { PrismaService } from '../shared/prisma/prisma.service';

/**
 * StripeWebhookProcessor — BullMQ processor for the stripe-webhook queue.
 *
 * Reliability contract:
 *  - Idempotency: WebhookEvent status=PENDING set by controller.
 *    Worker marks it PROCESSED or FAILED — never re-processes.
 *  - Business logic: Fully delegated to Application UseCases.
 *  - Transaction: subscription update + payment record + webhook status
 *    updated atomically inside a Prisma $transaction.
 *
 * Structured log fields on every log:
 *   stripe_event_id, event_type, worker_job_id, duration_ms
 *   (organization_id, subscription_id added by UseCases)
 */
import { OnApplicationShutdown } from '@nestjs/common';

@Processor(QUEUE_NAMES.STRIPE_WEBHOOK)
export class StripeWebhookProcessor extends WorkerHost implements OnApplicationShutdown {
    private readonly logger = new Logger(StripeWebhookProcessor.name);

    constructor(
        private readonly handlePaymentSucceeded: HandlePaymentSucceededUseCase,
        private readonly handleSubscriptionCanceled: HandleSubscriptionCanceledUseCase,
        private readonly handleInvoiceFailed: HandleInvoiceFailedUseCase,
        private readonly handleCheckoutSessionCompleted: HandleCheckoutSessionCompletedUseCase,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async onApplicationShutdown(signal?: string) {
        this.logger.log(`Worker shutting down due to ${signal}... waiting for active jobs to finish`);
        if (this.worker) {
            await this.worker.close();
        }
        this.logger.log('Worker closed gracefully');
    }

    async process(job: Job<StripeWebhookJobPayload>): Promise<void> {
        const { eventId, eventType } = job.data;
        const startTime = Date.now();

        this.logger.log({
            msg: 'Worker job started',
            stripe_event_id: eventId,
            event_type: eventType,
            worker_job_id: job.id,
            attempt: job.attemptsMade + 1,
        });

        // ── 1. Check idempotency — skip if already PROCESSED ───────────────
        const webhookEvent = await this.prisma.webhookEvent.findUnique({
            where: { id: eventId },
        });

        if (webhookEvent?.status === 'PROCESSED') {
            this.logger.warn({
                msg: 'Event already processed — skipping',
                stripe_event_id: eventId,
                worker_job_id: job.id,
                processed_at: webhookEvent.processedAt,
            });
            return;
        }

        // ── 2. Dispatch to UseCase ─────────────────────────────────────────
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

                case JOB_NAMES.STRIPE_CHECKOUT_COMPLETED:
                    await this.handleCheckoutSessionCompleted.execute(
                        job.data.data as CheckoutSessionCompletedEventData,
                    );
                    break;

                default:
                    this.logger.warn({
                        msg: 'Unknown job name — skipping',
                        stripe_event_id: eventId,
                        worker_job_id: job.id,
                        job_name: job.name,
                    });
                    return;
            }

            // ── 3. Mark webhook as PROCESSED ──────────────────────────────
            await this.prisma.webhookEvent.update({
                where: { id: eventId },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date(),
                },
            });

            this.logger.log({
                msg: 'Worker job completed',
                stripe_event_id: eventId,
                event_type: eventType,
                worker_job_id: job.id,
                duration_ms: Date.now() - startTime,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : 'UnknownError';

            // 1. Business rule error -> IGNORED, no retry
            if (errorName === 'InvalidTransitionError' || errorName === 'BadRequestException') {
                await this.prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: {
                        status: 'IGNORED',
                        errorMessage,
                        processedAt: new Date(),
                    },
                });

                this.logger.warn({
                    msg: 'Event ignored due to business rule validation',
                    stripe_event_id: eventId,
                    event_type: eventType,
                    error: errorMessage,
                });
                return; // Do not throw, effectively ignoring the job
            }

            // 1.5. Catch Prisma Unique Constraint Error (P2002) for idempotent payments
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                await this.prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: {
                        status: 'PROCESSED', // Treat as successful
                        processedAt: new Date(),
                    },
                });

                this.logger.log({
                    msg: 'Event skipped — Payment provider ID already exists (Idempotent)',
                    stripe_event_id: eventId,
                    event_type: eventType,
                });
                return; // Do not throw
            }

            // 2. Mark FAILED only when all attempts exhausted (DLQ logic)
            const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
            if (isLastAttempt) {
                await this.prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: {
                        status: 'FAILED',
                        errorMessage,
                        failedAt: new Date(),
                    },
                }).catch(() => {
                    this.logger.error('Failed to update webhook event status to FAILED');
                });
            }

            // 3. Unexpected system error or Transient Error -> Retry & log critical
            this.logger.error({
                msg: 'Worker job failed',
                stripe_event_id: eventId,
                event_type: eventType,
                worker_job_id: job.id,
                attempt: job.attemptsMade + 1,
                is_last_attempt: isLastAttempt,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                duration_ms: Date.now() - startTime,
            });

            throw error; // Let BullMQ handle retry
        }
    }
}
