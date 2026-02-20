import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from './queue.constants';
import { SubscriptionExpirationProcessor } from './subscription-expiration.processor';
import { SubscriptionExpirationScheduler } from './subscription-expiration.scheduler';
import { ExpireAllDueSubscriptionsUseCase } from '../modules/subscription/application/expire-all-due-subscriptions.usecase';
import { PrismaSubscriptionRepository } from '../modules/subscription/infrastructure/prisma-subscription.repository';

/**
 * SubscriptionJobsModule — wires BullMQ queue, processor, scheduler,
 * and the application-layer use case that the processor delegates to.
 *
 * Redis connection via Upstash TLS TCP endpoint (ioredis-compatible):
 *   REDIS_HOST      — Upstash hostname  (e.g. special-lioness-xxxxx.upstash.io)
 *   REDIS_PORT      — 6380 (Upstash TLS port)
 *   REDIS_PASSWORD  — Upstash REST token (used as ioredis password)
 *   REDIS_TLS       — "true" to enable TLS (required for Upstash)
 *
 * NOTE: Upstash enforces a max connection limit. BullMQ is configured with
 * maxRetriesPerRequest=null and enableReadyCheck=false as recommended by
 * the BullMQ + Upstash integration guide.
 */
@Module({
    imports: [
        BullModule.forRootAsync({
            useFactory: () => {
                const isTls = process.env.REDIS_TLS === 'true';

                return {
                    connection: {
                        host: process.env.REDIS_HOST ?? 'localhost',
                        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
                        password: process.env.REDIS_PASSWORD,
                        // TLS required for Upstash; harmless when disabled locally
                        tls: isTls ? {} : undefined,
                        // Required settings for BullMQ + Upstash compatibility
                        maxRetriesPerRequest: null,
                        enableReadyCheck: false,
                    },
                };
            },
        }),
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
