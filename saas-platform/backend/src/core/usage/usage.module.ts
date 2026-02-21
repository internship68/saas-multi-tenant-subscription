import { Module } from '@nestjs/common';
import { UsageController } from './presentation/usage/usage.controller';
import { GetCurrentUsageUseCase } from './application/get-current-usage.usecase';

import { PrismaUsageRepository } from './infrastructure/prisma-usage.repository';

@Module({
  controllers: [UsageController],
  providers: [
    {
      provide: 'UsageRepository',
      useClass: PrismaUsageRepository,
    },
    GetCurrentUsageUseCase
  ],
  exports: ['UsageRepository', GetCurrentUsageUseCase],
})
export class UsageModule { }

