import { randomUUID } from 'crypto';
import { Role } from './role.enum';

export class User {
    private constructor(
        private readonly id: string,
        private readonly email: string,
        private passwordHash: string,
        private name: string,
        private role: Role,
        private organizationId: string,
        private readonly createdAt: Date,
    ) { }

    changeOrganization(newOrganizationId: string, newRole: Role): void {
        this.organizationId = newOrganizationId;
        this.role = newRole;
    }

    static create(
        email: string,
        passwordHash: string,
        name: string,
        role: Role,
        organizationId: string,
    ): User {
        if (!email || !email.includes('@')) {
            throw new Error('Invalid email format');
        }

        if (!passwordHash) {
            throw new Error('Password hash is required');
        }

        if (!name || name.trim() === '') {
            throw new Error('Name is required');
        }

        if (!organizationId) {
            throw new Error('Organization ID is required');
        }

        return new User(
            randomUUID(),
            email.toLowerCase(),
            passwordHash,
            name,
            role,
            organizationId,
            new Date(),
        );
    }

    static restore(props: {
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: Role;
        organizationId: string;
        createdAt: Date;
    }): User {
        return new User(
            props.id,
            props.email,
            props.passwordHash,
            props.name,
            props.role,
            props.organizationId,
            props.createdAt,
        );
    }

    getId(): string {
        return this.id;
    }

    getEmail(): string {
        return this.email;
    }

    getPasswordHash(): string {
        return this.passwordHash;
    }

    getName(): string {
        return this.name;
    }

    getRole(): Role {
        return this.role;
    }

    getOrganizationId(): string {
        return this.organizationId;
    }

    getCreatedAt(): Date {
        return new Date(this.createdAt);
    }

    changeName(newName: string): void {
        if (!newName || newName.trim() === '') {
            throw new Error('Name cannot be empty');
        }
        this.name = newName;
    }

    changeRole(newRole: Role): void {
        this.role = newRole;
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            role: this.role,
            organizationId: this.organizationId,
            createdAt: new Date(this.createdAt),
        };
    }
}
