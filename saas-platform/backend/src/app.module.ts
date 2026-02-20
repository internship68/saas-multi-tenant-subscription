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
import { QueueInfrastructureModule } from './shared/queue/queue-infrastructure.module';
import { SubscriptionJobsModule } from './jobs/subscription-jobs.module';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    // ── Shared Infrastructure (Global) ───────────────────────────────────
    PrismaModule,           // Global Prisma client
    RedisModule,            // Global @upstash/redis REST client (for caching)
    QueueInfrastructureModule, // Global BullMQ TCP connection (for background jobs)

    // ── Feature Modules ──────────────────────────────────────────────────
    AuthModule,
    OrganizationModule,
    UserModule,
    SubscriptionModule,
    PaymentModule,
    UsageModule,

    // ── Background Jobs & Webhooks ───────────────────────────────────────
    SubscriptionJobsModule, // Daily expiration cron queue
    WebhookModule,          // Stripe webhook receiver + processing queue
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
