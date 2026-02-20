import { randomUUID } from 'crypto';

export class Invitation {
    private constructor(
        private readonly id: string,
        private readonly email: string,
        private readonly organizationId: string,
        private readonly token: string,
        private readonly role: string,
        private status: 'PENDING' | 'ACCEPTED',
        private readonly createdAt: Date,
    ) { }

    static create(email: string, organizationId: string, role: string = 'MEMBER'): Invitation {
        if (!email || !organizationId) {
            throw new Error('Email and Organization ID are required');
        }
        return new Invitation(
            randomUUID(),
            email.toLowerCase(),
            organizationId,
            randomUUID(), // simple token generator
            role,
            'PENDING',
            new Date(),
        );
    }

    static restore(props: {
        id: string;
        email: string;
        organizationId: string;
        token: string;
        role: string;
        status: 'PENDING' | 'ACCEPTED';
        createdAt: Date;
    }): Invitation {
        return new Invitation(
            props.id,
            props.email,
            props.organizationId,
            props.token,
            props.role,
            props.status,
            props.createdAt,
        );
    }

    accept(): void {
        if (this.status !== 'PENDING') {
            throw new Error('Invitation is not pending');
        }
        this.status = 'ACCEPTED';
    }

    getId(): string {
        return this.id;
    }

    getEmail(): string {
        return this.email;
    }

    getOrganizationId(): string {
        return this.organizationId;
    }

    getToken(): string {
        return this.token;
    }

    getRole(): string {
        return this.role;
    }

    getStatus(): 'PENDING' | 'ACCEPTED' {
        return this.status;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            organizationId: this.organizationId,
            token: this.token,
            role: this.role,
            status: this.status,
            createdAt: this.createdAt,
        };
    }
}
