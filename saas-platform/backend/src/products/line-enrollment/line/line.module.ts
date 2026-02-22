import { Module } from '@nestjs/common';
import { LineController } from './presentation/line.controller';
import { HandleLineWebhookUseCase } from './application/handle-line-webhook.usecase';
import { ConnectLineUseCase } from './application/connect-line.usecase';
import { ListLeadsUseCase } from './application/list-leads.usecase';
import { GetNotificationsUseCase } from './application/get-notifications.usecase';
import { MarkNotificationReadUseCase } from './application/mark-notification-read.usecase';
import { TakeoverLeadUseCase } from './application/takeover-lead.usecase';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [LineController],
    providers: [HandleLineWebhookUseCase, ConnectLineUseCase, ListLeadsUseCase, GetNotificationsUseCase, MarkNotificationReadUseCase, TakeoverLeadUseCase],
    exports: [HandleLineWebhookUseCase, ConnectLineUseCase, ListLeadsUseCase, GetNotificationsUseCase, MarkNotificationReadUseCase, TakeoverLeadUseCase],
})
export class LineModule { }
