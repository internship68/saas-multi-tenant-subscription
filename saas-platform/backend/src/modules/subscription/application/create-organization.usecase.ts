import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../domain/organization.entity';
import { Subscription } from '../domain/subscription.entity';
import { OrganizationRepository } from '../domain/organization.repository.interface';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionChangedEvent } from '../domain/events/subscription-changed.event';

import { UsageRepository } from '../../usage/domain/usage.repository.interface';
import { OrganizationUsage } from '../../usage/domain/organization-usage.entity';
import { PLAN_LIMITS } from '../../usage/domain/plan-limits.constants';

export interface CreateOrganizationCommand {
  name: string;
}

export interface CreateOrganizationResult {
  organization: Organization;
  subscription: Subscription;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    @Inject('SubscriptionRepository')
    private readonly subscriptionRepository: SubscriptionRepository,
    @Inject('UsageRepository')
    private readonly usageRepository: UsageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(
    command: CreateOrganizationCommand,
  ): Promise<CreateOrganizationResult> {
    const organization = Organization.create(command.name);
    const subscription = Subscription.createFree(organization.getId());

    // Initialize API_CALLS usage
    const usage = OrganizationUsage.create(
      organization.getId(),
      'API_CALLS',
      PLAN_LIMITS[subscription.getPlan()].apiCallsLimit,
      subscription.getCurrentPeriodEnd()
    );

    await this.organizationRepository.save(organization);
    await this.subscriptionRepository.save(subscription);
    await this.usageRepository.save(usage);

    // Emit audit event
    this.eventEmitter.emit(
      'domain.subscription_changed',
      new SubscriptionChangedEvent(
        organization.getId(),
        subscription.getId(),
        'CREATED',
        { plan: subscription.getPlan(), orgName: organization.getName() }
      )
    );

    return { organization, subscription };
  }
}
