/**
 * Stripe Price IDs mapping from environment variables.
 * This prevents hardcoding IDs in the codebase.
 */
export const STRIPE_PRICES = {
    PRO: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_ent_placeholder',
};

export type PlanType = keyof typeof STRIPE_PRICES;
