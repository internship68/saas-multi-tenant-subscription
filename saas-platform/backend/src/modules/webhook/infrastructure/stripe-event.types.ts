/**
 * Internal Stripe event type definitions — Infrastructure layer only.
 *
 * These are OUR types, not Stripe SDK types. This boundary ensures:
 *  - Domain layer has zero knowledge of Stripe
 *  - If Stripe SDK changes, only this file + StripeService change
 *  - Application layer UseCases receive clean, domain-friendly commands
 *
 * When real Stripe SDK is added, StripeService maps SDK types → these types.
 */

// ─── Raw Webhook Event (as received from Stripe) ────────────────────────────

export interface StripeWebhookEvent {
    /** Stripe event ID — used for idempotency checks */
    id: string;
    type: string;
    created: number;
    data: {
        object: Record<string, unknown>;
    };
}

// ─── Stripe Event Types we handle ───────────────────────────────────────────

export const STRIPE_EVENT_TYPES = {
    PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
    CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
} as const;

// ─── Parsed Command Data (what Handlers receive — no raw Stripe objects) ────

/**
 * Extracted from Stripe metadata: `metadata.organizationId`
 * SaaS pattern: always embed organizationId in Stripe customer/subscription metadata.
 */
export interface PaymentSucceededEventData {
    /** Our internal organization ID (from Stripe metadata) */
    organizationId: string;
    /** Stripe payment intent ID — used as providerPaymentId for unique constraint */
    stripePaymentIntentId: string;
    /** Stripe subscription ID */
    stripeSubscriptionId: string;
    /** Stripe customer ID */
    stripeCustomerId: string;
    /** Amount in smallest currency unit (e.g. cents) */
    amountReceived: number;
    currency: string;
    /** Duration in days for the subscription period paid for */
    durationInDays: number;
    /** Plan string from Stripe metadata */
    plan: string;
}

export interface SubscriptionCanceledEventData {
    organizationId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
}

export interface InvoiceFailedEventData {
    organizationId: string;
    stripeInvoiceId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    amountDue: number;
    currency: string;
    /** Number of retries Stripe has attempted */
    attemptCount: number;
}

// ─── BullMQ Job Payload ──────────────────────────────────────────────────────

/**
 * Shape of data stored in the STRIPE_WEBHOOK queue.
 * Processor reads this and routes to the correct UseCase.
 */
export interface StripeWebhookJobPayload {
    /** Stripe event ID — for idempotency */
    eventId: string;
    /** Stripe event type string */
    eventType: string;
    /** Parsed, clean data (not raw Stripe SDK object) */
    data:
    | PaymentSucceededEventData
    | SubscriptionCanceledEventData
    | InvoiceFailedEventData;
}
