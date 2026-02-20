export enum PlanType {
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
  private readonly id: string;
  private readonly organizationId: string;
  private readonly plan: PlanType;
  private status: SubscriptionStatus;
  private readonly currentPeriodStart: Date;
  private currentPeriodEnd: Date;
  private readonly createdAt: Date;

  private constructor(
    id: string,
    organizationId: string,
    plan: PlanType,
    status: SubscriptionStatus,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    createdAt: Date,
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.plan = plan;
    this.status = status;
    this.currentPeriodStart = currentPeriodStart;
    this.currentPeriodEnd = currentPeriodEnd;
    this.createdAt = createdAt;
  }

  static createFree(organizationId: string): Subscription {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    const id = this.generateId();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    return new Subscription(
      id,
      organizationId,
      PlanType.FREE,
      SubscriptionStatus.ACTIVE,
      now,
      endDate,
      now,
    );
  }

  static create(
    organizationId: string,
    plan: PlanType,
    durationInDays: number,
  ): Subscription {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    if (!plan || !Object.values(PlanType).includes(plan)) {
      throw new Error('Invalid plan type');
    }

    if (!durationInDays || durationInDays <= 0) {
      throw new Error('Duration in days must be greater than 0');
    }

    const id = this.generateId();
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
    return this.status === SubscriptionStatus.ACTIVE;
  }

  upgradeTo(plan: PlanType, durationInDays: number): Subscription {
    if (this.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Can only upgrade active subscriptions');
    }

    if (!plan || !Object.values(PlanType).includes(plan)) {
      throw new Error('Invalid plan type');
    }

    if (this.plan === plan) {
      throw new Error('Cannot upgrade to the same plan');
    }

    if (!durationInDays || durationInDays <= 0) {
      throw new Error('Duration in days must be greater than 0');
    }

    const id = Subscription.generateId();
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
      this.organizationId,
      plan,
      SubscriptionStatus.ACTIVE,
      now,
      endDate,
      now,
    );
  }

  getId(): string {
    return this.id;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getPlan(): PlanType {
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

  private static generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
