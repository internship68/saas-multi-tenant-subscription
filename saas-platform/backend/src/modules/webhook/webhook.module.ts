import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../../jobs/queue.constants';
import { StripeWebhookProcessor } from '../../jobs/stripe-webhook.processor';
import { StripeService } from './infrastructure/stripe.service';
import { HandlePaymentSucceededUseCase } from './application/handle-payment-succeeded.usecase';
import { HandleSubscriptionCanceledUseCase } from './application/handle-subscription-canceled.usecase';
import { HandleInvoiceFailedUseCase } from './application/handle-invoice-failed.usecase';
import { HandleCheckoutSessionCompletedUseCase } from './application/handle-checkout-completed.usecase';
import { WebhookController } from './presentation/webhook.controller';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentModule } from '../payment/payment.module';

/**
 * WebhookModule — wires Stripe webhook handling end-to-end.
 */
@Module({
    imports: [
        BullModule.registerQueue({
            name: QUEUE_NAMES.STRIPE_WEBHOOK,
        }),
        SubscriptionModule,
        PaymentModule,
    ],
    controllers: [WebhookController],
    providers: [
        StripeService,
        HandlePaymentSucceededUseCase,
        HandleSubscriptionCanceledUseCase,
        HandleInvoiceFailedUseCase,
        HandleCheckoutSessionCompletedUseCase,
        StripeWebhookProcessor,
    ],
})
export class WebhookModule { }
