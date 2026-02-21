import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../subscription/domain/subscription.entity';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CheckoutSessionCompletedEventData } from '../infrastructure/stripe-event.types';

@Injectable()
export class HandleCheckoutSessionCompletedUseCase {
    private readonly logger = new Logger(HandleCheckoutSessionCompletedUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async execute(command: CheckoutSessionCompletedEventData): Promise<void> {
        if (!command.organizationId) {
            this.logger.warn('Received checkout session without organizationId metadata');
            return;
        }

        // ── 1. Check if subscription already created ────────────────────────
        let subscription = await this.repository.findByOrganizationId(command.organizationId);

        if (!subscription) {
            // New subscription — Stripe doesn't send plan initially, we map to PRO for checkout
            // (Assuming all checkouts are for PRO atm, or grab from metadata)
            subscription = Subscription.create(
                command.organizationId,
                SubscriptionPlan.PRO,
                30 // days
            );
        } else {
            // Upgrade existing one if needed
            subscription.upgradeTo(SubscriptionPlan.PRO, 30);
        }

        const subData = subscription.toJSON();

        // ── Atomic transaction ─────────────────────────────────────────────
        await this.prisma.$transaction(async (tx) => {
            await tx.subscription.upsert({
                where: { id: subData.id },
                create: subData,
                update: subData,
            });
        }, { isolationLevel: 'Serializable' });

        this.logger.log({
            msg: 'Checkout Session Completed — Subscription Activated',
            organization_id: command.organizationId,
            user_id: command.userId,
            subscription_id: subData.id,
            stripe_subscription_id: command.stripeSubscriptionId,
        });
    }
}
