import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';
import { ProcessPeriodicBillingUseCase } from '../core/subscription/application/process-periodic-billing.usecase';

@Processor(QUEUE_NAMES.USAGE_RESET)
export class SubscriptionResetProcessor extends WorkerHost {
    private readonly logger = new Logger(SubscriptionResetProcessor.name);

    constructor(
        private readonly processPeriodicBillingUseCase: ProcessPeriodicBillingUseCase,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log(`Processing job [${job.name}] id=${job.id} on queue "${QUEUE_NAMES.USAGE_RESET}"`);

        if (job.name === JOB_NAMES.RESET_PERIODIC_USAGE) {
            await this.processPeriodicBillingUseCase.execute();
            this.logger.log(`Job [${job.name}] completed successfully.`);
            return;
        }

        this.logger.warn(`Unknown job name received: "${job.name}" — skipping.`);
    }
}
