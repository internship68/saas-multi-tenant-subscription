import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../../jobs/queue.constants';
import { StripeWebhookProcessor } from '../../jobs/stripe-webhook.processor';
import { StripeService } from './infrastructure/stripe.service';
import { HandlePaymentSucceededUseCase } from './application/handle-payment-succeeded.usecase';
import { HandleSubscriptionCanceledUseCase } from './application/handle-subscription-canceled.usecase';
import { HandleInvoiceFailedUseCase } from './application/handle-invoice-failed.usecase';
import { WebhookController } from './presentation/webhook.controller';
import { PrismaSubscriptionRepository } from '../subscription/infrastructure/prisma-subscription.repository';

/**
 * WebhookModule — wires Stripe webhook handling end-to-end.
 *
 * BullMQ root connection is provided globally by QueueInfrastructureModule.
 * This module only registers the STRIPE_WEBHOOK queue.
 *
 * Flow:
 *   Stripe → POST /webhooks/stripe
 *         → WebhookController (validates signature via StripeService)
 *         → BullMQ STRIPE_WEBHOOK queue
 *         → StripeWebhookProcessor
 *         → Handle*UseCase
 *         → Domain entity methods
 *         → PrismaSubscriptionRepository
 */
@Module({
    imports: [
        BullModule.registerQueue({
            name: QUEUE_NAMES.STRIPE_WEBHOOK,
        }),
    ],
    controllers: [WebhookController],
    providers: [
        // Infrastructure: Stripe signature validator + event parser
        StripeService,

        // Infrastructure: Prisma repository (fulfils Domain interface)
        {
            provide: 'SubscriptionRepository',
            useClass: PrismaSubscriptionRepository,
        },

        // Application UseCases
        HandlePaymentSucceededUseCase,
        HandleSubscriptionCanceledUseCase,
        HandleInvoiceFailedUseCase,

        // BullMQ Processor
        StripeWebhookProcessor,
    ],
})
export class WebhookModule { }
