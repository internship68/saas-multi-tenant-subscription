import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';

@Injectable()
export class SubscriptionResetScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(SubscriptionResetScheduler.name);

    constructor(
        @InjectQueue(QUEUE_NAMES.USAGE_RESET)
        private readonly queue: Queue,
    ) { }

    async onApplicationBootstrap(): Promise<void> {
        await this.registerDailyResetJob();
    }

    private async registerDailyResetJob(): Promise<void> {
        try {
            const repeatableJobs = await this.queue.getRepeatableJobs();
            for (const job of repeatableJobs) {
                if (job.name === JOB_NAMES.RESET_PERIODIC_USAGE) {
                    await this.queue.removeRepeatableByKey(job.key);
                }
            }

            await this.queue.add(
                JOB_NAMES.RESET_PERIODIC_USAGE,
                {},
                {
                    repeat: {
                        pattern: '0 0 * * *', // cron: daily at midnight UTC
                    },
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000 * 60 * 5,
                    },
                    removeOnComplete: { count: 10 },
                    removeOnFail: { count: 20 },
                },
            );

            this.logger.log(
                `Registered repeatable job "${JOB_NAMES.RESET_PERIODIC_USAGE}" on queue "${QUEUE_NAMES.USAGE_RESET}"`,
            );
        } catch (error) {
            this.logger.error(`Failed to register reset job: ${error}`);
        }
    }
}
