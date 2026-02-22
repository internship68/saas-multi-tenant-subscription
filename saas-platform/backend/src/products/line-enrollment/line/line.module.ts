import { Module } from '@nestjs/common';
import { LineController } from './presentation/line.controller';
import { HandleLineWebhookUseCase } from './application/handle-line-webhook.usecase';
import { ConnectLineUseCase } from './application/connect-line.usecase';
import { ListLeadsUseCase } from './application/list-leads.usecase';
import { GetNotificationsUseCase } from './application/get-notifications.usecase';
import { MarkNotificationReadUseCase } from './application/mark-notification-read.usecase';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [LineController],
    providers: [HandleLineWebhookUseCase, ConnectLineUseCase, ListLeadsUseCase, GetNotificationsUseCase, MarkNotificationReadUseCase],
    exports: [HandleLineWebhookUseCase, ConnectLineUseCase, ListLeadsUseCase, GetNotificationsUseCase, MarkNotificationReadUseCase],
})
export class LineModule { }
