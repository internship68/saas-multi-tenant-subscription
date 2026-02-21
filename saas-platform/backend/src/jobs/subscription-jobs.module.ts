import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QUEUE_NAMES } from './queue.constants';
import { SubscriptionExpirationProcessor } from './subscription-expiration.processor';
import { SubscriptionExpirationScheduler } from './subscription-expiration.scheduler';
import { ExpireAllDueSubscriptionsUseCase } from '../core/subscription/application/expire-all-due-subscriptions.usecase';
import { PrismaSubscriptionRepository } from '../core/subscription/infrastructure/prisma-subscription.repository';
import { SubscriptionResetProcessor } from './subscription-reset.processor';
import { SubscriptionResetScheduler } from './subscription-reset.scheduler';
import { ProcessPeriodicBillingUseCase } from '../core/subscription/application/process-periodic-billing.usecase';
import { PrismaUsageRepository } from '../core/usage/infrastructure/prisma-usage.repository';
import { PrismaService } from '../shared/prisma/prisma.service';
import { WebhookRetentionJob } from './webhook-retention.job';

import { UsageModule } from '../core/usage/usage.module';

@Module({
    imports: [
        BullModule.registerQueue(
            { name: QUEUE_NAMES.BILLING_EXPIRATION },
            { name: QUEUE_NAMES.USAGE_RESET }
        ),
        ScheduleModule.forRoot(),
        UsageModule,
    ],
    providers: [
        PrismaService,
        {
            provide: 'SubscriptionRepository',
            useClass: PrismaSubscriptionRepository,
        },
        // Application use cases
        ExpireAllDueSubscriptionsUseCase,
        ProcessPeriodicBillingUseCase,
        // BullMQ processors & schedulers
        SubscriptionExpirationProcessor,
        SubscriptionExpirationScheduler,
        SubscriptionResetProcessor,
        SubscriptionResetScheduler,
        // Retention jobs
        WebhookRetentionJob,
    ],
})
export class SubscriptionJobsModule { }
