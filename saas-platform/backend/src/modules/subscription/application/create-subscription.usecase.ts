import { Subscription } from '../domain/subscription.entity';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';

export class CreateSubscriptionUseCase {
  constructor(private readonly repository: SubscriptionRepository) {}

  async execute(organizationId: string): Promise<void> {
    const existing = await this.repository.findByOrganizationId(organizationId);

    if (existing && existing.isActive()) {
      throw new Error('Organization already has active subscription');
    }

    const subscription = Subscription.createFree(organizationId);

    await this.repository.save(subscription);
  }
}
