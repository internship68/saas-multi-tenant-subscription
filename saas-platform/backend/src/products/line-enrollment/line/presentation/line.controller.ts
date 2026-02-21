import { Controller, Post, Headers, Body, Param, Req, HttpCode, HttpStatus, RawBodyRequest, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { HandleLineWebhookUseCase } from '../application/handle-line-webhook.usecase';
import { ConnectLineUseCase } from '../application/connect-line.usecase';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';

@Controller('products/line-enrollment')
export class LineController {
    constructor(
        private readonly handleLineWebhook: HandleLineWebhookUseCase,
        private readonly connectLine: ConnectLineUseCase,
    ) { }

    @Post('connect')
    @UseGuards(JwtAuthGuard)
    async connect(@Req() req: any, @Body() body: any) {
        return this.connectLine.execute({
            organizationId: req.user.organizationId,
            channelId: body.channelId,
            channelSecret: body.channelSecret,
            channelAccessToken: body.channelAccessToken,
        });
    }

    @Post('webhook/:integrationId')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Param('integrationId') integrationId: string,
        @Headers('x-line-signature') signature: string,
        @Req() req: RawBodyRequest<Request>,
        @Body() body: any,
    ) {
        // req.rawBody contains the buffer if rawBody: true is enabled in main.ts
        if (!req.rawBody) {
            throw new Error('Raw body not available. Ensure NestFactory.create(AppModule, { rawBody: true }) is set.');
        }

        await this.handleLineWebhook.execute({
            integrationId,
            signature,
            rawBody: req.rawBody,
            events: body.events || [],
        });

        return { status: 'success' };
    }
}
