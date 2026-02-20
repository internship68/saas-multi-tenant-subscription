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
}

type PrismaServiceWithSubscription = PrismaService & {
  subscription: SubscriptionDelegate;
};

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

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaServiceWithSubscription) {}

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
}
