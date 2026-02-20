/**
 * Centralised BullMQ queue and job name constants.
 * Import from here — never hardcode queue/job names inline.
 */
export const QUEUE_NAMES = {
    SUBSCRIPTION_EXPIRATION: 'subscription-expiration',
} as const;

export const JOB_NAMES = {
    EXPIRE_DUE_SUBSCRIPTIONS: 'expire-due-subscriptions',
} as const;
