import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../domain/subscription.entity';

// ─── Prisma Model Shape (Infrastructure Detail) ─────────────────────────────

interface PrismaSubscription {
  id: string;
  organizationId: string;
  plan: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}

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
  };
}

// ─── Repository Implementation ───────────────────────────────────────────────

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

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

    return mapPrismaToDomain(model as PrismaSubscription);
  }

  async findById(id: string): Promise<Subscription | null> {
    const model = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!model) return null;

    return mapPrismaToDomain(model as PrismaSubscription);
  }

  async findAllExpired(): Promise<Subscription[]> {
    const now = new Date();

    const models = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lt: now },
      },
    });

    return models.map((m) =>
      mapPrismaToDomain(m as PrismaSubscription),
    );
  }
  async findAllDueForRenewal(): Promise<Subscription[]> {
    return this.findAllExpired();
  }
}