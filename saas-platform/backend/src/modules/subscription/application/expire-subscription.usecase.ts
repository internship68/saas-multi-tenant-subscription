import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';

export interface ExpireSubscriptionCommand {
    organizationId: string;
}

@Injectable()
export class ExpireSubscriptionUseCase {
    private readonly logger = new Logger(ExpireSubscriptionUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
    ) { }

    async execute(command: ExpireSubscriptionCommand): Promise<void> {
        const subscription = await this.repository.findByOrganizationId(
            command.organizationId,
        );

        if (!subscription) {
            throw new NotFoundException(
                `Subscription not found for organization: ${command.organizationId}`,
            );
        }

        // Business rule lives in the entity — we just call it here
        subscription.expire();

        await this.repository.save(subscription);

        this.logger.log(
            `Subscription expired for organization: ${command.organizationId}`,
        );
    }
}
