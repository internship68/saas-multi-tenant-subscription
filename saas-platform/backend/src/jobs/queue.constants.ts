/**
 * Centralised BullMQ queue and job name constants.
 * Import from here — never hardcode queue/job names inline.
 */
export const QUEUE_NAMES = {
    BILLING_EXPIRATION: 'billing-expiration', // Replaces subscription-expiration
    USAGE_RESET: 'usage-reset',
    STRIPE_WEBHOOK: 'stripe-webhook',
} as const;

export const JOB_NAMES = {
    // Subscription expiration job
    EXPIRE_DUE_SUBSCRIPTIONS: 'expire-due-subscriptions',

    // Usage reset job
    RESET_PERIODIC_USAGE: 'reset-periodic-usage',

    // Stripe webhook job names — one per Stripe event type we handle
    STRIPE_PAYMENT_SUCCEEDED: 'stripe.payment_succeeded',
    STRIPE_SUBSCRIPTION_CANCELED: 'stripe.subscription_canceled',
    STRIPE_INVOICE_FAILED: 'stripe.invoice_failed',
    STRIPE_CHECKOUT_COMPLETED: 'stripe.checkout_completed',
} as const;
