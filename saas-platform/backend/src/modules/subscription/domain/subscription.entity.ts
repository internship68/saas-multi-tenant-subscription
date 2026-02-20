import { randomUUID } from 'crypto';

export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export class Subscription {
  private constructor(
    private readonly id: string,
    private readonly organizationId: string,
    private plan: SubscriptionPlan,
    private status: SubscriptionStatus,
    private currentPeriodStart: Date,
    private currentPeriodEnd: Date,
    private readonly createdAt: Date,
  ) {}

  static createFree(organizationId: string): Subscription {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    const id = randomUUID();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    return new Subscription(
      id,
      organizationId,
      SubscriptionPlan.FREE,
      SubscriptionStatus.ACTIVE,
      now,
      endDate,
      now,
    );
  }

  static create(
    organizationId: string,
    plan: SubscriptionPlan,
    durationInDays: number,
  ): Subscription {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
      throw new Error('Invalid plan type');
    }

    if (!durationInDays || durationInDays <= 0) {
      throw new Error('Duration in days must be greater than 0');
    }

    const id = randomUUID();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + durationInDays);

    if (endDate.getTime() <= now.getTime()) {
      throw new Error(
        'Current period end must be greater than current period start',
      );
    }

    return new Subscription(
      id,
      organizationId,
      plan,
      SubscriptionStatus.ACTIVE,
      now,
      endDate,
      now,
    );
  }

  static restore(props: {
    id: string;
    organizationId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    createdAt: Date;
  }): Subscription {
    return new Subscription(
      props.id,
      props.organizationId,
      props.plan,
      props.status,
      props.currentPeriodStart,
      props.currentPeriodEnd,
      props.createdAt,
    );
  }

  cancel(): void {
    if (this.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Can only cancel active subscriptions');
    }

    this.status = SubscriptionStatus.CANCELED;
  }

  expire(): void {
    if (this.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Can only expire active subscriptions');
    }

    this.status = SubscriptionStatus.EXPIRED;
  }

  isActive(): boolean {
    const now = new Date();
    return (
      this.status === SubscriptionStatus.ACTIVE &&
      now >= this.currentPeriodStart &&
      now <= this.currentPeriodEnd
    );
  }

  upgradeTo(plan: SubscriptionPlan, durationInDays: number): void {
    if (this.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Can only upgrade active subscriptions');
    }

    if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
      throw new Error('Invalid plan type');
    }

    if (this.plan === plan) {
      throw new Error('Cannot upgrade to the same plan');
    }

    if (!durationInDays || durationInDays <= 0) {
      throw new Error('Duration in days must be greater than 0');
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + durationInDays);

    this.plan = plan;
    this.status = SubscriptionStatus.ACTIVE;
    this.currentPeriodStart = now;
    this.currentPeriodEnd = endDate;
  }

  getId(): string {
    return this.id;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getPlan(): SubscriptionPlan {
    return this.plan;
  }

  getStatus(): SubscriptionStatus {
    return this.status;
  }

  getCurrentPeriodStart(): Date {
    return new Date(this.currentPeriodStart);
  }

  getCurrentPeriodEnd(): Date {
    return new Date(this.currentPeriodEnd);
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      plan: this.plan,
      status: this.status,
      currentPeriodStart: new Date(this.currentPeriodStart),
      currentPeriodEnd: new Date(this.currentPeriodEnd),
      createdAt: new Date(this.createdAt),
    };
  }
}
