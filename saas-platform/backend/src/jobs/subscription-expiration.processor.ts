import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';
import { ExpireAllDueSubscriptionsUseCase } from '../core/subscription/application/expire-all-due-subscriptions.usecase';

/**
 * BullMQ Processor — Infrastructure concern only.
 *
 * Responsibilities:
 *  - Listen to the "subscription-expiration" queue.
 *  - Delegate ALL business logic to the Application Use Case.
 *  - Log outcomes from the job runner perspective.
 *
 * Layer contract: this file MUST NOT contain any business logic,
 * Prisma queries, or domain knowledge — it only orchestrates.
 */
@Processor(QUEUE_NAMES.BILLING_EXPIRATION)
export class SubscriptionExpirationProcessor extends WorkerHost {
    private readonly logger = new Logger(SubscriptionExpirationProcessor.name);

    constructor(
        private readonly expireAllDueSubscriptionsUseCase: ExpireAllDueSubscriptionsUseCase,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log(
            `Processing job [${job.name}] id=${job.id} on queue "${QUEUE_NAMES.BILLING_EXPIRATION}"`,
        );

        if (job.name === JOB_NAMES.EXPIRE_DUE_SUBSCRIPTIONS) {
            const result = await this.expireAllDueSubscriptionsUseCase.execute();

            this.logger.log(
                `Job [${job.name}] completed — ` +
                `total: ${result.total}, succeeded: ${result.succeeded}, failed: ${result.failed}`,
            );

            if (result.errors.length > 0) {
                for (const err of result.errors) {
                    this.logger.warn(
                        `Failed to expire org ${err.organizationId}: ${err.reason}`,
                    );
                }
            }

            return;
        }

        this.logger.warn(`Unknown job name received: "${job.name}" — skipping.`);
    }
}
