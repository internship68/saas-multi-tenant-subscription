import { Subscription } from './subscription.entity';

export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findByOrganizationId(organizationId: string): Promise<Subscription | null>;
}
