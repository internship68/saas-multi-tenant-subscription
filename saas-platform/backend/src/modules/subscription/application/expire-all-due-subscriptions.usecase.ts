import { Inject, Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { Subscription } from '../domain/subscription.entity';
import { SubscriptionChangedEvent } from '../domain/events/subscription-changed.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ExpireAllDueSubscriptionsResult {
    total: number;
    succeeded: number;
    failed: number;
    errors: Array<{ organizationId: string; reason: string }>;
}

/**
 * Application Use Case — orchestrates batch expiration.
 *
 * Responsibilities:
 *  1. Fetch all subscriptions eligible for expiration (ACTIVE + past end date).
 *  2. For each, call the domain rule and persist.
 *  3. Report results; **never throw** so the job processor stays stable.
 *
 * Layer contract: touches Domain entities and the Repository interface only.
 * Prisma / BullMQ are invisible from here.
 */
@Injectable()
export class ExpireAllDueSubscriptionsUseCase {
    private readonly logger = new Logger(ExpireAllDueSubscriptionsUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async execute(): Promise<ExpireAllDueSubscriptionsResult> {
        const expiredSubscriptions: Subscription[] =
            await this.repository.findAllExpired();

        const result: ExpireAllDueSubscriptionsResult = {
            total: expiredSubscriptions.length,
            succeeded: 0,
            failed: 0,
            errors: [],
        };

        this.logger.log(
            `Found ${expiredSubscriptions.length} subscription(s) to expire.`,
        );

        for (const subscription of expiredSubscriptions) {
            const organizationId = subscription.getOrganizationId();
            try {
                // Business rule: expire() lives in the entity — no logic here
                subscription.expire();
                await this.repository.save(subscription);
                result.succeeded++;

                // Emit audit event
                this.eventEmitter.emit(
                    'domain.subscription_changed',
                    new SubscriptionChangedEvent(
                        organizationId,
                        subscription.getId(),
                        'EXPIRED',
                        { plan: subscription.getPlan(), expiredAt: new Date(), batch: true }
                    )
                );

                this.logger.log(`Expired subscription for org: ${organizationId}`);
            } catch (error: unknown) {
                result.failed++;
                const reason =
                    error instanceof Error ? error.message : 'Unknown error';
                result.errors.push({ organizationId, reason });

                this.logger.error(
                    `Failed to expire subscription for org ${organizationId}: ${reason}`,
                );
            }
        }

        this.logger.log(
            `Expiration run complete. ` +
            `Success: ${result.succeeded}, Failed: ${result.failed}, Total: ${result.total}`,
        );

        return result;
    }
}
