import { Global, Module } from '@nestjs/common';
import { Redis } from '@upstash/redis';

/**
 * RedisModule — provides the Upstash REST-based Redis client globally.
 *
 * Use this client (@upstash/redis) for:
 *  - Caching (rate-limit counters, response cache, etc.)
 *  - Feature flags
 *  - Session tokens
 *
 * Do NOT use this for BullMQ — BullMQ uses the ioredis TCP connection
 * configured in SubscriptionJobsModule (see REDIS_HOST / REDIS_PORT / REDIS_PASSWORD env vars).
 */
export const UPSTASH_REDIS = 'UPSTASH_REDIS';

@Global()
@Module({
    providers: [
        {
            provide: UPSTASH_REDIS,
            useFactory: (): Redis => {
                const url = process.env.UPSTASH_REDIS_REST_URL;
                const token = process.env.UPSTASH_REDIS_REST_TOKEN;

                if (!url || !token) {
                    throw new Error(
                        'Missing Upstash Redis config. ' +
                        'Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your .env',
                    );
                }

                return new Redis({ url, token });
            },
        },
    ],
    exports: [UPSTASH_REDIS],
})
export class RedisModule { }
