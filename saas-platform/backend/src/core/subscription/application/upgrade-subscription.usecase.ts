import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { SubscriptionPlan, Subscription } from '../domain/subscription.entity';
import { SubscriptionChangedEvent } from '../domain/events/subscription-changed.event';

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
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(command: UpgradeSubscriptionCommand): Promise<Subscription> {
    const subscription = await this.repository.findByOrganizationId(
      command.organizationId,
    );
    if (!subscription) {
      throw new NotFoundException('Subscription not found for organization');
    }

    const oldPlan = subscription.getPlan();
    subscription.upgradeTo(command.plan, command.durationInDays);
    await this.repository.save(subscription);

    // Emit audit event
    this.eventEmitter.emit(
      'domain.subscription_changed',
      new SubscriptionChangedEvent(
        command.organizationId,
        subscription.getId(),
        'UPGRADED',
        { oldPlan, newPlan: command.plan, duration: command.durationInDays }
      )
    );

    return subscription;
  }
}
