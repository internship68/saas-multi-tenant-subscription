import { randomUUID } from 'crypto';

export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum Feature {
  LINE_ENROLLMENT = 'LINE_ENROLLMENT',
  CRM_LITE = 'CRM_LITE',
  AI_SALES = 'AI_SALES',
}

export const PLAN_FEATURES: Record<SubscriptionPlan, Feature[]> = {
  [SubscriptionPlan.FREE]: [],
  [SubscriptionPlan.PRO]: [Feature.LINE_ENROLLMENT, Feature.CRM_LITE],
  [SubscriptionPlan.ENTERPRISE]: [Feature.LINE_ENROLLMENT, Feature.CRM_LITE, Feature.AI_SALES],
};

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

// ─── State Machine ─────────────────────────────────────────────────────────
// Defines allowed status transitions. Prevents illegal state changes.
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.ACTIVE]: [SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.CANCELED]: [], // terminal state
  [SubscriptionStatus.EXPIRED]: [],  // terminal state
};

export class InvalidTransitionError extends Error {
  constructor(from: SubscriptionStatus, to: SubscriptionStatus) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

function assertValidTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// ─── Entity ────────────────────────────────────────────────────────────────

export class Subscription {
  private constructor(
    private readonly id: string,
    private readonly organizationId: string,
    private plan: SubscriptionPlan,
    private status: SubscriptionStatus,
    private currentPeriodStart: Date,
    private currentPeriodEnd: Date,
    private readonly createdAt: Date,
  ) { }

  static createFree(organizationId: string): Subscription {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Organization ID is required');
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    return new Subscription(
      randomUUID(),
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

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + durationInDays);

    if (endDate.getTime() <= now.getTime()) {
      throw new Error('Current period end must be greater than current period start');
    }

    return new Subscription(
      randomUUID(),
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

  // ─── State Transitions (all guarded by state machine) ──────────────────

  cancel(): void {
    assertValidTransition(this.status, SubscriptionStatus.CANCELED);
    this.status = SubscriptionStatus.CANCELED;
  }

  expire(): void {
    assertValidTransition(this.status, SubscriptionStatus.EXPIRED);
    this.status = SubscriptionStatus.EXPIRED;
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

  renew(durationInDays: number): void {
    if (this.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Can only renew active subscriptions');
    }
    if (!durationInDays || durationInDays <= 0) {
      throw new Error('Duration in days must be greater than 0');
    }

    const newStart = new Date(this.currentPeriodEnd);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + durationInDays);

    this.currentPeriodStart = newStart;
    this.currentPeriodEnd = newEnd;
  }

  // ─── Getters ───────────────────────────────────────────────────────────

  getId(): string { return this.id; }
  getOrganizationId(): string { return this.organizationId; }
  getPlan(): SubscriptionPlan { return this.plan; }
  getStatus(): SubscriptionStatus { return this.status; }
  getCurrentPeriodStart(): Date { return new Date(this.currentPeriodStart); }
  getCurrentPeriodEnd(): Date { return new Date(this.currentPeriodEnd); }
  getCreatedAt(): Date { return new Date(this.createdAt); }

  isActive(): boolean {
    const now = new Date();
    return (
      this.status === SubscriptionStatus.ACTIVE &&
      now >= this.currentPeriodStart &&
      now <= this.currentPeriodEnd
    );
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
