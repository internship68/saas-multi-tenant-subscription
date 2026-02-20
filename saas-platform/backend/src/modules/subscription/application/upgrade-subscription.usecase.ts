import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { SubscriptionPlan } from '../domain/subscription.entity';
import { Subscription } from '../domain/subscription.entity';

export interface UpgradeSubscriptionCommand {
  organizationId: string;
  plan: SubscriptionPlan;
  durationInDays: number;
}

@Injectable()
export class UpgradeSubscriptionUseCase {
  constructor(
    @Inject('SubscriptionRepository')
    private readonly repository: SubscriptionRepository,
  ) {}

  async execute(command: UpgradeSubscriptionCommand): Promise<Subscription> {
    const subscription = await this.repository.findByOrganizationId(
      command.organizationId,
    );
    if (!subscription) {
      throw new NotFoundException('Subscription not found for organization');
    }

    subscription.upgradeTo(command.plan, command.durationInDays);
    await this.repository.save(subscription);
    return subscription;
  }
}
