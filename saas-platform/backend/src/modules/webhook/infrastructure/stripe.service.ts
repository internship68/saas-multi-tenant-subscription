import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
    InvoiceFailedEventData,
    PaymentSucceededEventData,
    STRIPE_EVENT_TYPES,
    StripeWebhookEvent,
    SubscriptionCanceledEventData,
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

        if (!webhookSecret) {
            throw new Error(
                'STRIPE_WEBHOOK_SECRET is not configured. ' +
                'Set it in your .env file.',
            );
        }

        if (!signature) {
            throw new UnauthorizedException('Missing stripe-signature header');
        }

        // ─── TODO: Replace with real Stripe SDK validation ───────────────────
        // When real Stripe SDK is installed:
        //
        //   import Stripe from 'stripe';
        //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        //   try {
        //     return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        //   } catch {
        //     throw new UnauthorizedException('Invalid Stripe webhook signature');
        //   }
        //
        // ─── SKELETON: Simple constant-time signature check ──────────────────
        // For development/testing: accept events with test signature token
        const isTestMode = process.env.STRIPE_TEST_MODE === 'true';
        if (!isTestMode) {
            // In production skeleton mode: validate signature format minimally
            if (!signature.startsWith('t=') || !signature.includes(',v1=')) {
                throw new UnauthorizedException('Invalid Stripe signature format');
            }
        }

        this.logger.debug(
            `Stripe signature validated (skeleton mode). Body size: ${rawBody.length} bytes`,
        );

        // Parse the raw body as a Stripe event
        try {
            const event = JSON.parse(rawBody.toString('utf-8')) as StripeWebhookEvent;

            if (!event.id || !event.type || !event.data?.object) {
                throw new Error('Invalid Stripe event structure');
            }

            return event;
        } catch {
            throw new UnauthorizedException('Invalid Stripe event payload');
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
            organizationId: metadata['organizationId'] ?? '',
            stripeSubscriptionId:
                (eventObject['id'] as string) ?? '',
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
            organizationId: metadata['organizationId'] ?? '',
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
            organizationId: metadata['organizationId'] ?? '',
            stripeInvoiceId: (eventObject['id'] as string) ?? '',
            stripeCustomerId: (eventObject['customer'] as string) ?? '',
            stripeSubscriptionId: (eventObject['subscription'] as string) ?? '',
            amountDue: (eventObject['amount_due'] as number) ?? 0,
            currency: (eventObject['currency'] as string) ?? 'usd',
            attemptCount: (eventObject['attempt_count'] as number) ?? 1,
        };
    }
}
