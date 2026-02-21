import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import Stripe from 'stripe';
import {
    InvoiceFailedEventData,
    PaymentSucceededEventData,
    STRIPE_EVENT_TYPES,
    StripeWebhookEvent,
    SubscriptionCanceledEventData,
    CheckoutSessionCompletedEventData,
} from './stripe-event.types';
import { JOB_NAMES } from '../../../jobs/queue.constants';
import { SubscriptionPlan } from '../../subscription/domain/subscription.entity';

/**
 * StripeService — Infrastructure layer.
 *
 * Responsibilities:
 *  1. Validate Stripe webhook signature (HMAC SHA-256).
 *  2. Parse raw Stripe event object into our internal types.
 *  3. Map Stripe event type → BullMQ job name.
 *
 * Layer contract:
 *  - This is the ONLY file that knows about Stripe.
 *  - Domain and Application layers must NOT import from here.
 *  - When real Stripe SDK is added, only this file changes.
 *
 * TODO: Install `stripe` npm package and replace skeleton validation with:
 *   import Stripe from 'stripe';
 *   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
 *   stripe.webhooks.constructEvent(rawBody, signature, secret);
 */
@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);

    /**
     * Validates the Stripe-Signature header and parses the event.
     *
     * @param rawBody  Raw request body Buffer (required for HMAC validation)
     * @param signature  Value of the 'stripe-signature' header
     * @returns Parsed StripeWebhookEvent
     * @throws UnauthorizedException if signature is invalid
     */
    validateAndParseEvent(
        rawBody: Buffer,
        signature: string,
    ): StripeWebhookEvent {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const secretKey = process.env.STRIPE_SECRET_KEY;

        if (!webhookSecret || !secretKey) {
            throw new Error(
                'Missing Stripe configuration (STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET).',
            );
        }

        const stripe = new Stripe(secretKey);

        try {
            const event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret,
            );

            // Map Stripe event to our internal StripeWebhookEvent type
            return {
                id: event.id,
                type: event.type,
                created: event.created,
                data: {
                    object: event.data.object as unknown as Record<string, unknown>,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Stripe signature validation failed: ${message}`);
            throw new UnauthorizedException(`Invalid Stripe signature: ${message}`);
        }
    }

    /**
     * Maps a Stripe event type string to our BullMQ job name constant.
     * Returns null if the event type is not handled.
     */
    resolveJobName(eventType: string): string | null {
        const mapping: Record<string, string> = {
            [STRIPE_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED]:
                JOB_NAMES.STRIPE_PAYMENT_SUCCEEDED,
            [STRIPE_EVENT_TYPES.CUSTOMER_SUBSCRIPTION_DELETED]:
                JOB_NAMES.STRIPE_SUBSCRIPTION_CANCELED,
            [STRIPE_EVENT_TYPES.INVOICE_PAYMENT_FAILED]:
                JOB_NAMES.STRIPE_INVOICE_FAILED,
            [STRIPE_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED]:
                JOB_NAMES.STRIPE_CHECKOUT_COMPLETED,
        };

        return mapping[eventType] ?? null;
    }

    /**
     * Parses a payment_intent.succeeded event into our internal type.
     * Extracts organizationId from Stripe metadata.
     */
    parsePaymentSucceeded(
        eventObject: Record<string, unknown>,
    ): PaymentSucceededEventData {
        const metadata = (eventObject['metadata'] as Record<string, string>) ?? {};

        return {
            organizationId: metadata['organizationId'] || 'org-test-webhook',
            stripePaymentIntentId: (eventObject['id'] as string) ?? '',
            stripeSubscriptionId:
                (eventObject['subscription'] as string) ?? '',
            stripeCustomerId: (eventObject['customer'] as string) ?? '',
            amountReceived: (eventObject['amount_received'] as number) ?? 0,
            currency: (eventObject['currency'] as string) ?? 'usd',
            // Metadata fields set by us when creating Stripe subscription
            durationInDays: parseInt(metadata['durationInDays'] ?? '30', 10),
            plan: metadata['plan'] ?? SubscriptionPlan.FREE,
        };
    }

    /**
     * Parses a customer.subscription.deleted event into our internal type.
     */
    parseSubscriptionCanceled(
        eventObject: Record<string, unknown>,
    ): SubscriptionCanceledEventData {
        const metadata = (eventObject['metadata'] as Record<string, string>) ?? {};

        return {
            organizationId: metadata['organizationId'] || 'org-test-webhook',
            stripeSubscriptionId: (eventObject['id'] as string) ?? '',
            stripeCustomerId: (eventObject['customer'] as string) ?? '',
        };
    }

    /**
     * Parses an invoice.payment_failed event into our internal type.
     */
    parseInvoiceFailed(
        eventObject: Record<string, unknown>,
    ): InvoiceFailedEventData {
        const metadata = (eventObject['metadata'] as Record<string, string>) ?? {};

        return {
            organizationId: metadata['organizationId'] || 'org-test-webhook',
            stripeInvoiceId: (eventObject['id'] as string) ?? '',
            stripeCustomerId: (eventObject['customer'] as string) ?? '',
            stripeSubscriptionId: (eventObject['subscription'] as string) ?? '',
            amountDue: (eventObject['amount_due'] as number) ?? 0,
            currency: (eventObject['currency'] as string) ?? 'usd',
            attemptCount: parseInt(metadata['attemptCount'] ?? '0', 10) || (eventObject['attempt_count'] as number) || 1,
        };
    }

    /**
     * Parses a checkout.session.completed event into our internal type.
     */
    parseCheckoutSessionCompleted(
        eventObject: Record<string, unknown>,
    ): CheckoutSessionCompletedEventData {
        const metadata = (eventObject['metadata'] as Record<string, string>) ?? {};

        return {
            organizationId: metadata['organizationId'] || 'org-test-webhook',
            userId: metadata['userId'] || 'user-test-webhook',
            stripeSubscriptionId: (eventObject['subscription'] as string) ?? '',
            stripeCustomerId: (eventObject['customer'] as string) ?? '',
            stripePaymentIntentId: (eventObject['payment_intent'] as string) ?? undefined,
        };
    }
}
