import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';

/**
 * Scheduler — Infrastructure concern.
 *
 * Registers a repeatable BullMQ job that fires once per day at midnight UTC.
 * Uses BullMQ's built-in repeat / cron scheduling so the job survives
 * process restarts and is de-duplicated automatically.
 *
 * Layer contract: this class only enqueues jobs. No business logic allowed.
 */
@Injectable()
export class SubscriptionExpirationScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(SubscriptionExpirationScheduler.name);

    constructor(
        @InjectQueue(QUEUE_NAMES.SUBSCRIPTION_EXPIRATION)
        private readonly queue: Queue,
    ) { }

    async onApplicationBootstrap(): Promise<void> {
        await this.registerDailyExpirationJob();
    }

    private async registerDailyExpirationJob(): Promise<void> {
        try {
            // Remove existing repeatable jobs to prevent duplicates on restart
            const repeatableJobs = await this.queue.getRepeatableJobs();
            for (const job of repeatableJobs) {
                if (job.name === JOB_NAMES.EXPIRE_DUE_SUBSCRIPTIONS) {
                    await this.queue.removeRepeatableByKey(job.key);
                    this.logger.log('Removed existing repeatable expiration job.');
                }
            }

            // Schedule a new repeatable job: every day at 00:00 UTC
            await this.queue.add(
                JOB_NAMES.EXPIRE_DUE_SUBSCRIPTIONS,
                {},
                {
                    repeat: {
                        pattern: '0 0 * * *', // cron: daily at midnight UTC
                    },
                    removeOnComplete: { count: 10 }, // keep last 10 completed jobs for debugging
                    removeOnFail: { count: 20 },     // keep last 20 failed jobs for investigation
                },
            );

            this.logger.log(
                `Registered repeatable job "${JOB_NAMES.EXPIRE_DUE_SUBSCRIPTIONS}" ` +
                `on queue "${QUEUE_NAMES.SUBSCRIPTION_EXPIRATION}" — cron: 0 0 * * *`,
            );
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to register expiration job: ${reason}`);
        }
    }
}
