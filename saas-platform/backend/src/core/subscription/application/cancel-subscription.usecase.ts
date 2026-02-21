import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { Subscription } from '../domain/subscription.entity';

export interface CancelSubscriptionCommand {
  organizationId: string;
}

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject('SubscriptionRepository')
    private readonly repository: SubscriptionRepository,
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<Subscription> {
    const subscription = await this.repository.findByOrganizationId(
      command.organizationId,
    );
    if (!subscription) {
      throw new NotFoundException('Subscription not found for organization');
    }

    subscription.cancel();
    await this.repository.save(subscription);
    return subscription;
  }
}
