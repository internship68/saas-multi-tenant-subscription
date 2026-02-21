import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * BillingService — Stripe Checkout Session creation.
 *
 * Uses the Stripe SDK to create a Checkout Session in `subscription` mode.
 * The organizationId is embedded in metadata so that webhooks can map
 * the resulting subscription to the correct org.
 */
@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);
    private readonly stripe: Stripe;

    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is required');
        }
        this.stripe = new Stripe(secretKey);
    }

    /**
     * Creates a Stripe Checkout Session for a subscription.
     *
     * @param organizationId  Our internal org ID — embedded in metadata
     * @param userId          Our internal user ID — embedded in metadata
     * @param priceId         Stripe Price ID (e.g. price_xxx from Dashboard)
     * @param successUrl      Where to redirect after successful payment
     * @param cancelUrl       Where to redirect if user cancels
     * @returns Checkout session URL to redirect the user to
     */
    async createCheckoutSession(params: {
        organizationId: string;
        userId: string;
        priceId: string;
        successUrl: string;
        cancelUrl: string;
    }): Promise<{ sessionId: string; url: string }> {
        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: params.priceId,
                    quantity: 1,
                },
            ],
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            metadata: {
                organizationId: params.organizationId,
                userId: params.userId,
            },
            subscription_data: {
                metadata: {
                    organizationId: params.organizationId,
                    userId: params.userId,
                },
            },
        });

        this.logger.log({
            msg: 'Checkout session created',
            session_id: session.id,
            organization_id: params.organizationId,
            user_id: params.userId,
            price_id: params.priceId,
        });

        return {
            sessionId: session.id,
            url: session.url!,
        };
    }
}
