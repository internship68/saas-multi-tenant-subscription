import { DomainEvent } from '../../../../shared/domain/domain-event.base';

export class SubscriptionChangedEvent extends DomainEvent {
    constructor(
        private readonly organizationId: string,
        private readonly subscriptionId: string,
        private readonly action: 'CREATED' | 'UPGRADED' | 'CANCELED' | 'EXPIRED',
        private readonly metadata: Record<string, any>,
    ) {
        super();
    }

    getOrganizationId(): string { return this.organizationId; }
    getAction(): string { return `SUBSCRIPTION_${this.action}`; }
    getEntityType(): string { return 'Subscription'; }
    getEntityId(): string { return this.subscriptionId; }
    getMetadata(): Record<string, any> { return this.metadata; }
}
