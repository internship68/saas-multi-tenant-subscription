import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { SubscriptionChangedEvent } from '../domain/events/subscription-changed.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ExpireSubscriptionCommand {
    organizationId: string;
}

@Injectable()
export class ExpireSubscriptionUseCase {
    private readonly logger = new Logger(ExpireSubscriptionUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
        private readonly eventEmitter: EventEmitter2,
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

        // Emit audit event
        this.eventEmitter.emit(
            'domain.subscription_changed',
            new SubscriptionChangedEvent(
                command.organizationId,
                subscription.getId(),
                'EXPIRED',
                { plan: subscription.getPlan(), expiredAt: new Date() }
            )
        );

        this.logger.log(
            `Subscription expired for organization: ${command.organizationId}`,
        );
    }
}
