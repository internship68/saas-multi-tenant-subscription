import { Module } from '@nestjs/common';
import { SubscriptionController } from './presentation/subscription/subscription.controller';
import { CreateOrganizationUseCase } from './application/create-organization.usecase';
import { CreateSubscriptionUseCase } from './application/create-subscription.usecase';
import { UpgradeSubscriptionUseCase } from './application/upgrade-subscription.usecase';
import { CancelSubscriptionUseCase } from './application/cancel-subscription.usecase';
import { GetSubscriptionStatusUseCase } from './application/get-subscription-status.usecase';
import { PrismaSubscriptionRepository } from './infrastructure/prisma-subscription.repository';
import { PrismaOrganizationRepository } from './infrastructure/prisma-organization.repository';
import { ActiveSubscriptionGuard } from '../../shared/guards/active-subscription.guard';

import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [UsageModule],
  controllers: [SubscriptionController],
  providers: [
    {
      provide: 'SubscriptionRepository',
      useClass: PrismaSubscriptionRepository,
    },
    {
      provide: 'OrganizationRepository',
      useClass: PrismaOrganizationRepository,
    },
    CreateOrganizationUseCase,
    CreateSubscriptionUseCase,
    UpgradeSubscriptionUseCase,
    CancelSubscriptionUseCase,
    GetSubscriptionStatusUseCase,
    ActiveSubscriptionGuard,
  ],
  exports: [GetSubscriptionStatusUseCase],
})
export class SubscriptionModule { }
