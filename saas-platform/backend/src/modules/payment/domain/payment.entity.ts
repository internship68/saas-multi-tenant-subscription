import { randomUUID } from 'crypto';

export enum PaymentStatus {
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    PENDING = 'PENDING',
}

export class Payment {
    private constructor(
        private readonly id: string,
        private readonly organizationId: string,
        private readonly subscriptionId: string,
        private readonly amount: number,
        private readonly currency: string,
        private readonly status: PaymentStatus,
        private readonly createdAt: Date,
        private readonly providerPaymentId?: string,
    ) { }

    static create(props: {
        organizationId: string;
        subscriptionId: string;
        amount: number;
        currency: string;
        status: PaymentStatus;
        providerPaymentId?: string;
    }): Payment {
        return new Payment(
            randomUUID(),
            props.organizationId,
            props.subscriptionId,
            props.amount,
            props.currency,
            props.status,
            new Date(),
            props.providerPaymentId,
        );
    }

    static restore(props: {
        id: string;
        organizationId: string;
        subscriptionId: string;
        amount: number;
        currency: string;
        status: PaymentStatus;
        createdAt: Date;
        providerPaymentId?: string | null;
    }): Payment {
        return new Payment(
            props.id,
            props.organizationId,
            props.subscriptionId,
            props.amount,
            props.currency,
            props.status,
            props.createdAt,
            props.providerPaymentId ?? undefined,
        );
    }

    public toJSON() {
        return {
            id: this.id,
            organizationId: this.organizationId,
            subscriptionId: this.subscriptionId,
            amount: this.amount,
            currency: this.currency,
            status: this.status,
            createdAt: this.createdAt,
            providerPaymentId: this.providerPaymentId,
        };
    }
}
