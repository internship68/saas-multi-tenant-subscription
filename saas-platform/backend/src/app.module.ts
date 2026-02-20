import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UserModule } from './modules/user/user.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymentModule } from './modules/payment/payment.module';
import { UsageModule } from './modules/usage/usage.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { SubscriptionJobsModule } from './jobs/subscription-jobs.module';

@Module({
  imports: [
    AuthModule,
    OrganizationModule,
    UserModule,
    SubscriptionModule,
    PaymentModule,
    UsageModule,
    PrismaModule,
    RedisModule,
    SubscriptionJobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
