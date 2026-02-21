import { Inject, Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { UsageRepository } from '../../usage/domain/usage.repository.interface';
import { PLAN_LIMITS } from '../../usage/domain/plan-limits.constants';
import { SubscriptionStatus } from '../domain/subscription.entity';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ProcessPeriodicBillingUseCase {
    private readonly logger = new Logger(ProcessPeriodicBillingUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly subscriptionRepository: SubscriptionRepository,
        @Inject('UsageRepository')
        private readonly usageRepository: UsageRepository,
        private readonly prisma: PrismaService, // Using prisma directly for Payment creation to keep it simple for now
    ) { }

    async execute(): Promise<void> {
        const now = new Date();
        // Find subscriptions that are ACTIVE and currentPeriodEnd <= now
        const dueSubscriptions = await this.subscriptionRepository.findAllDueForRenewal();

        for (const subscription of dueSubscriptions) {
            try {
                const orgId = subscription.getOrganizationId();
                const plan = subscription.getPlan();
                const limits = PLAN_LIMITS[plan];

                // 1. Renew subscription period (e.g., +30 days)
                subscription.renew(30);
                await this.subscriptionRepository.save(subscription);

                // 2. Reset Usage
                const usage = await this.usageRepository.findByOrganizationIdAndType(orgId, 'API_CALLS');
                if (usage) {
                    usage.reset(limits.apiCallsLimit, subscription.getCurrentPeriodEnd());
                    await this.usageRepository.save(usage);
                }

                // 3. Generate Payment record (Simulated)
                // In a real app, this might involve Stripe invoice creation
                await this.prisma.payment.create({
                    data: {
                        organizationId: orgId,
                        subscriptionId: subscription.getId(),
                        amount: plan === 'FREE' ? 0 : plan === 'PRO' ? 29.0 : 299.0,
                        currency: 'USD',
                        status: 'SUCCEEDED',
                    },
                });

                this.logger.log(`Renewed subscription and reset usage for org: ${orgId}`);
            } catch (error) {
                this.logger.error(`Failed to process periodic billing for sub ${subscription.getId()}: ${error}`);
            }
        }
    }
}
