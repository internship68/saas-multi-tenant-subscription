import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from './queue.constants';
import { SubscriptionExpirationProcessor } from './subscription-expiration.processor';
import { SubscriptionExpirationScheduler } from './subscription-expiration.scheduler';
import { ExpireAllDueSubscriptionsUseCase } from '../modules/subscription/application/expire-all-due-subscriptions.usecase';
import { PrismaSubscriptionRepository } from '../modules/subscription/infrastructure/prisma-subscription.repository';

/**
 * SubscriptionJobsModule — wires the subscription expiration queue,
 * processor, scheduler, and use case.
 *
 * BullMQ root connection is provided globally by QueueInfrastructureModule.
 * This module only registers the queue it owns.
 */
@Module({
    imports: [
        BullModule.registerQueue({
            name: QUEUE_NAMES.SUBSCRIPTION_EXPIRATION,
        }),
    ],
    providers: [
        // Infrastructure: Prisma repository (fulfils Domain interface)
        {
            provide: 'SubscriptionRepository',
            useClass: PrismaSubscriptionRepository,
        },
        // Application use case
        ExpireAllDueSubscriptionsUseCase,
        // BullMQ processor & scheduler
        SubscriptionExpirationProcessor,
        SubscriptionExpirationScheduler,
    ],
})
export class SubscriptionJobsModule { }
