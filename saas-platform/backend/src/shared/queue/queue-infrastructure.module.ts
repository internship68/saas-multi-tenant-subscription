import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

/**
 * QueueInfrastructureModule — single source of truth for BullMQ root config.
 *
 * @Global() ensures the BullMQ connection is registered ONCE and shared
 * across all modules that use BullModule.registerQueue().
 *
 * Upstash TCP/TLS settings:
 *   REDIS_HOST      — Upstash hostname
 *   REDIS_PORT      — 6380 (Upstash TLS port)
 *   REDIS_PASSWORD  — Upstash REST token (ioredis password)
 *   REDIS_TLS       — "true" to enable TLS
 */
@Global()
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
                        tls: isTls ? {} : undefined,
                        // Required for BullMQ + Upstash compatibility
                        maxRetriesPerRequest: null,
                        enableReadyCheck: false,
                    },
                };
            },
        }),
    ],
    exports: [BullModule],
})
export class QueueInfrastructureModule { }
