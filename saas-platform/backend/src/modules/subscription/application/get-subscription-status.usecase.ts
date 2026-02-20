import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { SubscriptionStatus } from '../domain/subscription.entity';
import { SubscriptionPlan } from '../domain/subscription.entity';

export interface SubscriptionStatusResult {
  organizationId: string;
  hasSubscription: boolean;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus | 'NONE';
  active: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

@Injectable()
export class GetSubscriptionStatusUseCase {
  constructor(
    @Inject('SubscriptionRepository')
    private readonly repository: SubscriptionRepository,
  ) {}

  async execute(organizationId: string): Promise<SubscriptionStatusResult> {
    const subscription =
      await this.repository.findByOrganizationId(organizationId);

    if (!subscription) {
      return {
        organizationId,
        hasSubscription: false,
        plan: null,
        status: 'NONE',
        active: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      };
    }

    return {
      organizationId,
      hasSubscription: true,
      plan: subscription.getPlan(),
      status: subscription.getStatus(),
      active: subscription.isActive(),
      currentPeriodStart: subscription.getCurrentPeriodStart(),
      currentPeriodEnd: subscription.getCurrentPeriodEnd(),
    };
  }
}
