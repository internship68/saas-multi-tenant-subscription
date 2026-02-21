import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../jobs/queue.constants';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
    imports: [
        TerminusModule,
        ScheduleModule.forRoot(),
        PrismaModule,
        RedisModule,
        BullModule.registerQueue({
            name: QUEUE_NAMES.STRIPE_WEBHOOK,
        }),
    ],
    controllers: [HealthController],
})
export class HealthModule { }
