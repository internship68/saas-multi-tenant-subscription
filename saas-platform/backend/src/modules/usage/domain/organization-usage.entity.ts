import { randomUUID } from 'crypto';

export class OrganizationUsage {
    private constructor(
        private readonly id: string,
        private readonly organizationId: string,
        private readonly type: string,
        private currentValue: number,
        private limit: number,
        private resetAt: Date,
    ) { }

    static create(organizationId: string, type: string, limit: number, resetAt: Date): OrganizationUsage {
        return new OrganizationUsage(randomUUID(), organizationId, type, 0, limit, resetAt);
    }

    static restore(props: {
        id: string;
        organizationId: string;
        type: string;
        currentValue: number;
        limit: number;
        resetAt: Date;
    }): OrganizationUsage {
        return new OrganizationUsage(
            props.id,
            props.organizationId,
            props.type,
            props.currentValue,
            props.limit,
            props.resetAt,
        );
    }

    increment(amount: number = 1): void {
        if (this.currentValue + amount > this.limit) {
            throw new Error(`Usage limit exceeded for ${this.type}`);
        }
        this.currentValue += amount;
    }

    reset(newLimit: number, newResetAt: Date): void {
        this.currentValue = 0;
        this.limit = newLimit;
        this.resetAt = newResetAt;
    }

    isExceeded(): boolean {
        return this.currentValue >= this.limit;
    }

    getId(): string { return this.id; }
    getOrganizationId(): string { return this.organizationId; }
    getType(): string { return this.type; }
    getCurrentValue(): number { return this.currentValue; }
    getLimit(): number { return this.limit; }
    getResetAt(): Date { return new Date(this.resetAt); }
}
