import { Module } from '@nestjs/common';
import { UsageController } from './presentation/usage/usage.controller';
import { GetCurrentUsageUseCase } from './application/get-current-usage.usecase';

@Module({
  controllers: [UsageController],
  providers: [GetCurrentUsageUseCase],
  exports: [GetCurrentUsageUseCase],
})
export class UsageModule { }

