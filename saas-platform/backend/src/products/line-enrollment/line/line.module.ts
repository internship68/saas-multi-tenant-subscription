import { Module } from '@nestjs/common';
import { LineController } from './presentation/line.controller';
import { HandleLineWebhookUseCase } from './application/handle-line-webhook.usecase';
import { ConnectLineUseCase } from './application/connect-line.usecase';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [LineController],
    providers: [HandleLineWebhookUseCase, ConnectLineUseCase],
    exports: [HandleLineWebhookUseCase, ConnectLineUseCase],
})
export class LineModule { }
