import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Subscription } from '../domain/subscription.entity';
import { SubscriptionRepository } from '../domain/subscription.repository.interface';
import { SubscriptionPlan } from '../domain/subscription.entity';

export interface CreateSubscriptionCommand {
  organizationId: string;
  plan: SubscriptionPlan;
  durationInDays: number;
}

@Injectable()
export class CreateSubscriptionUseCase {
  constructor(
    @Inject('SubscriptionRepository')
    private readonly repository: SubscriptionRepository,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<Subscription> {
    const existing = await this.repository.findByOrganizationId(
      command.organizationId,
    );

    if (existing && existing.isActive()) {
      throw new BadRequestException(
        'Organization already has an active subscription',
      );
    }

    const subscription =
      command.plan === SubscriptionPlan.FREE
        ? Subscription.createFree(command.organizationId)
        : Subscription.create(
            command.organizationId,
            command.plan,
            command.durationInDays,
          );

    await this.repository.save(subscription);
    return subscription;
  }
}
