import { Module } from '@nestjs/common';
import { SubscriptionController } from './presentation/subscription/subscription.controller';

@Module({
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
