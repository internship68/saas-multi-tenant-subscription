export abstract class DomainEvent {
    public readonly occurredAt: Date;

    constructor() {
        this.occurredAt = new Date();
    }

    abstract getOrganizationId(): string;
    abstract getAction(): string;
    abstract getEntityType(): string;
    abstract getEntityId(): string;
    abstract getMetadata(): Record<string, any>;
}
