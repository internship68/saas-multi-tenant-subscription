import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../domain/subscription.entity';

interface PrismaSubscription {
  id: string;
  organizationId: string;
  plan: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}

interface SubscriptionDelegate {
  upsert(args: {
    where: { id: string };
    create: PrismaSubscription;
    update: PrismaSubscription;
  }): Promise<PrismaSubscription>;

  findFirst(args: {
    where: { organizationId: string };
    orderBy: { createdAt: 'desc' };
  }): Promise<PrismaSubscription | null>;

  findMany(args: {
    where: { status: string; currentPeriodEnd: { lt: Date } };
  }): Promise<PrismaSubscription[]>;
}

type PrismaServiceWithSubscription = PrismaService & {
  subscription: SubscriptionDelegate;
};

// ─── Mappers (Infrastructure detail — hidden from Domain) ────────────────────

function mapPrismaToDomain(model: PrismaSubscription): Subscription {
  return Subscription.restore({
    id: model.id,
    organizationId: model.organizationId,
    plan: model.plan as SubscriptionPlan,
    status: model.status as SubscriptionStatus,
    currentPeriodStart: model.currentPeriodStart,
    currentPeriodEnd: model.currentPeriodEnd,
    createdAt: model.createdAt,
  });
}

function mapDomainToPrisma(entity: Subscription): PrismaSubscription {
  const json = entity.toJSON();
  return {
    id: json.id,
    organizationId: json.organizationId,
    plan: json.plan,
    status: json.status,
    currentPeriodStart: json.currentPeriodStart,
    currentPeriodEnd: json.currentPeriodEnd,
    createdAt: json.createdAt,
  } as PrismaSubscription;
}

// ─── Repository Implementation ───────────────────────────────────────────────

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaServiceWithSubscription) { }

  async save(subscription: Subscription): Promise<void> {
    const data = mapDomainToPrisma(subscription);

    await this.prisma.subscription.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<Subscription | null> {
    const model = await this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    if (!model) {
      return null;
    }

    return mapPrismaToDomain(model);
  }

  /**
   * Infrastructure implementation of the domain contract.
   * Returns all subscriptions that are still ACTIVE in the DB but whose
   * currentPeriodEnd has already passed the current timestamp.
   *
   * Prisma query detail stays here — Domain remains unaware of it.
   */
  async findById(id: string): Promise<Subscription | null> {
    const model = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!model) return null;
    return mapPrismaToDomain(model as PrismaSubscription);
  }

  /**
   * Infrastructure implementation of the domain contract.
   * Returns all subscriptions that are still ACTIVE in the DB but whose
   * currentPeriodEnd has already passed the current timestamp.
   *
   * Prisma query detail stays here — Domain remains unaware of it.
   */
  async findAllExpired(): Promise<Subscription[]> {
    const now = new Date();

    const models = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lt: now },
      },
    });

    return models.map((m) => mapPrismaToDomain(m as PrismaSubscription));
  }

  async findAllDueForRenewal(): Promise<Subscription[]> {
    // For this version, we treat subscriptions whose period ended as due for renewal
    // In a real system, you might first try to charge, then renew or expire.
    return this.findAllExpired();
  }
}
