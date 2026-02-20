import { randomUUID } from 'crypto';

export class Organization {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly createdAt: Date,
  ) {}

  static create(name: string): Organization {
    if (!name || name.trim() === '') {
      throw new Error('Organization name is required');
    }

    const now = new Date();
    return new Organization(randomUUID(), name, now);
  }

  static restore(props: {
    id: string;
    name: string;
    createdAt: Date;
  }): Organization {
    return new Organization(props.id, props.name, props.createdAt);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: new Date(this.createdAt),
    };
  }
}
