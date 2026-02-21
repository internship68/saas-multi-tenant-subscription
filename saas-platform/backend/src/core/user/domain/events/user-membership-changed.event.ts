import { DomainEvent } from '../../../../shared/domain/domain-event.base';

export class UserMembershipChangedEvent extends DomainEvent {
    constructor(
        private readonly organizationId: string,
        private readonly userId: string,
        private readonly action: 'JOINED' | 'ROLE_CHANGED' | 'LEFT',
        private readonly metadata: Record<string, any>,
    ) {
        super();
    }

    getOrganizationId(): string { return this.organizationId; }
    getAction(): string { return `USER_${this.action}`; }
    getEntityType(): string { return 'User'; }
    getEntityId(): string { return this.userId; }
    getMetadata(): Record<string, any> { return this.metadata; }
}
