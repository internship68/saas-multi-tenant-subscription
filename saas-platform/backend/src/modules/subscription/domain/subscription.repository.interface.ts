import { Subscription } from './subscription.entity';

export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findByOrganizationId(organizationId: string): Promise<Subscription | null>;

  /**
   * Find all subscriptions that are ACTIVE but have passed their currentPeriodEnd.
   * Used by the expiration job to identify subscriptions that should be expired.
   */
  findAllExpired(): Promise<Subscription[]>;
}
