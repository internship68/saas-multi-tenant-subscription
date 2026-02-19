import { Module } from '@nestjs/common';
import { UsageController } from './presentation/usage/usage.controller';

@Module({
  controllers: [UsageController]
})
export class UsageModule {}
