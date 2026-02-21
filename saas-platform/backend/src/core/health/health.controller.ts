import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UPSTASH_REDIS } from '../../shared/redis/redis.module';
import { Redis } from '@upstash/redis';
import { QUEUE_NAMES } from '../../jobs/queue.constants';
import { Interval } from '@nestjs/schedule';

// ─── Cached Health State ────────────────────────────────────────────────────
// Pings DB / Redis / Queue every 15 s in the background.
// GET /health reads cached snapshot → zero latency, no main-thread blocking.
interface CachedHealthStatus {
    status: 'up' | 'down';
    message?: string;
    checkedAt: Date;
}

@Controller('health')
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    // Background-cached status — updated every 15 s by @Interval
    private redisStatus: CachedHealthStatus = { status: 'up', checkedAt: new Date() };
    private queueStatus: CachedHealthStatus & { isPaused?: boolean } = { status: 'up', checkedAt: new Date() };

    constructor(
        private health: HealthCheckService,
        private db: PrismaHealthIndicator,
        private prisma: PrismaService,
        @Inject(UPSTASH_REDIS) private readonly restRedis: Redis,
        @InjectQueue(QUEUE_NAMES.STRIPE_WEBHOOK) private readonly stripeQueue: Queue,
    ) {
        // Run first probe immediately on startup
        this.probeBackgroundHealth();
    }

    // ── Background probe (every 15 seconds) ─────────────────────────────────
    @Interval(15_000)
    async probeBackgroundHealth() {
        // Upstash Redis
        try {
            await this.restRedis.ping();
            this.redisStatus = { status: 'up', checkedAt: new Date() };
        } catch (e) {
            this.redisStatus = { status: 'down', message: String(e), checkedAt: new Date() };
            this.logger.error(`Redis health probe failed: ${e}`);
        }

        // BullMQ (ioredis)
        try {
            const client = await this.stripeQueue.client;
            await client.ping();
            const isPaused = await this.stripeQueue.isPaused();
            this.queueStatus = { status: 'up', isPaused, checkedAt: new Date() };
        } catch (e) {
            this.queueStatus = { status: 'down', message: String(e), checkedAt: new Date() };
            this.logger.error(`Queue health probe failed: ${e}`);
        }
    }

    // ── Public endpoint ─────────────────────────────────────────────────────
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // DB: direct ping is fine — Prisma pools connections, latency is <5 ms
            () => this.db.pingCheck('database', this.prisma as unknown as PrismaClient),

            // Redis: read cached state (no network call)
            async (): Promise<HealthIndicatorResult> => {
                if (this.redisStatus.status === 'down') {
                    throw new HealthCheckError('Redis failed', {
                        'upstash-redis': { status: 'down', message: this.redisStatus.message, checkedAt: this.redisStatus.checkedAt },
                    });
                }
                return { 'upstash-redis': { status: 'up', checkedAt: this.redisStatus.checkedAt } };
            },

            // Queue: read cached state (no network call)
            async (): Promise<HealthIndicatorResult> => {
                if (this.queueStatus.status === 'down') {
                    throw new HealthCheckError('Queue failed', {
                        'bullmq-queue': { status: 'down', message: this.queueStatus.message, checkedAt: this.queueStatus.checkedAt },
                    });
                }
                return { 'bullmq-queue': { status: 'up', isPaused: this.queueStatus.isPaused, checkedAt: this.queueStatus.checkedAt } };
            },
        ]);
    }
}
