import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../domain/organization.entity';
import { Subscription } from '../domain/subscription.entity';
import { OrganizationRepository } from '../domain/organization.repository.interface';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';

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
  ) {}

  async execute(
    command: CreateOrganizationCommand,
  ): Promise<CreateOrganizationResult> {
    const organization = Organization.create(command.name);
    const subscription = Subscription.createFree(organization.getId());

    await this.organizationRepository.save(organization);
    await this.subscriptionRepository.save(subscription);

    return { organization, subscription };
  }
}
