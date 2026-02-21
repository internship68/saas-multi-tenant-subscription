import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateOrganizationUseCase } from '../../application/create-organization.usecase';
import { CreateSubscriptionUseCase } from '../../application/create-subscription.usecase';
import { UpgradeSubscriptionUseCase } from '../../application/upgrade-subscription.usecase';
import { CancelSubscriptionUseCase } from '../../application/cancel-subscription.usecase';
import { GetSubscriptionStatusUseCase } from '../../application/get-subscription-status.usecase';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpgradeSubscriptionDto } from '../dto/upgrade-subscription.dto';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { SubscriptionPlan } from '../../domain/subscription.entity';
import { ActiveSubscriptionGuard } from '../../../../shared/guards/active-subscription.guard';
import { Idempotent } from '../../../../shared/decorators/idempotency.decorator';

@Controller()
export class SubscriptionController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly upgradeSubscriptionUseCase: UpgradeSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase,
  ) { }

  @Post('organizations')
  @Idempotent()
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    const result = await this.createOrganizationUseCase.execute({
      name: dto.name,
    });

    return {
      organization: result.organization.toJSON(),
      subscription: result.subscription.toJSON(),
    };
  }

  @Post('subscriptions/upgrade')
  @UseGuards(ActiveSubscriptionGuard)
  @Idempotent()
  async upgrade(@Body() dto: UpgradeSubscriptionDto) {
    const subscription = await this.upgradeSubscriptionUseCase.execute({
      organizationId: dto.organizationId,
      plan: dto.plan,
      durationInDays: dto.durationInDays,
    });

    return subscription.toJSON();
  }

  @Post('subscriptions/cancel')
  @UseGuards(ActiveSubscriptionGuard)
  @Idempotent()
  async cancel(@Body() dto: CancelSubscriptionDto) {
    const subscription = await this.cancelSubscriptionUseCase.execute({
      organizationId: dto.organizationId,
    });

    return subscription.toJSON();
  }

  @Post('subscriptions')
  async createSubscription() {
    const organizationId = 'TODO_ORGANIZATION_ID';
    const plan = SubscriptionPlan.FREE;
    const durationInDays = 30;

    const subscription = await this.createSubscriptionUseCase.execute({
      organizationId,
      plan,
      durationInDays,
    });

    return subscription.toJSON();
  }

  @Get('subscriptions/status/:organizationId')
  async getStatus(@Param('organizationId') organizationId: string) {
    return this.getSubscriptionStatusUseCase.execute(organizationId);
  }
}
