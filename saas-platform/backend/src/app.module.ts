import { DynamicModule, Module } from '@nestjs/common';
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
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { BillingModule } from './modules/billing/billing.module';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdempotencyInterceptor } from './shared/interceptors/idempotency.interceptor';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nest-throttler-storage-redis';
import Redis from 'ioredis';

@Module({})
export class AppModule {
  static forRoot(): DynamicModule {
    const role = process.env.APP_ROLE || 'ALL';

    const globalModules = [
      ConfigModule.forRoot({ isGlobal: true }),
      LoggerModule.forRoot({
        pinoHttp: {
          level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
          transport: process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
          // Include correlation ID in all logs
          genReqId: (req) => req.headers['x-request-id'] || req.id,
        },
      }),
      // ── Shared Infrastructure (Global) ───────────────────────────────────
      EventEmitterModule.forRoot({
        wildcard: true,
        delimiter: '.',
      }),
      PrismaModule,           // Global Prisma client
      RedisModule,            // Global @upstash/redis REST client (for caching)
      AuditModule,            // Global Audit system
      QueueInfrastructureModule, // Global BullMQ TCP connection (for background jobs)
      ThrottlerModule.forRootAsync({
        useFactory: () => ({
          throttlers: [
            { name: 'short', ttl: 1000, limit: 10 },    // 10 per sec
            { name: 'medium', ttl: 60000, limit: 100 }, // 100 per min
            { name: 'long', ttl: 3600000, limit: 2000 }, // 2000 per hour
          ],
          // storage: new ThrottlerStorageRedisService(new Redis(...))
          // NOTE: Production should use Redis storage to share limits across nodes
        }),
      }),
    ];

    const apiModules = [
      // ── Feature Modules ──────────────────────────────────────────────────
      AuthModule,
      OrganizationModule,
      UserModule,
      SubscriptionModule,
      PaymentModule,
      UsageModule,
      HealthModule,
      BillingModule,
    ];

    const workerModules = [
      // ── Background Jobs & Webhooks ───────────────────────────────────────
      SubscriptionJobsModule, // Daily expiration cron queue
      WebhookModule,          // Stripe webhook receiver + processing queue
    ];

    const imports: any[] = [...globalModules];

    if (role === 'API' || role === 'ALL') {
      imports.push(...apiModules);
    }

    if (role === 'WORKER' || role === 'ALL') {
      imports.push(...workerModules);
    }

    return {
      module: AppModule,
      imports,
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: APP_INTERCEPTOR,
          useClass: IdempotencyInterceptor,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    };
  }
}
