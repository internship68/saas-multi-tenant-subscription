import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { STRIPE_PRICES } from '../../shared/constants/price-keys';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
    constructor(
        private readonly billingService: BillingService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('checkout')
    async createCheckoutSession(@Req() req: any, @Body() dto: CreateCheckoutDto) {
        const user = req.user;
        const priceId = STRIPE_PRICES[dto.plan];

        const session = await this.billingService.createCheckoutSession({
            organizationId: user.organizationId,
            userId: user.userId,
            priceId: priceId,
            successUrl: dto.successUrl,
            cancelUrl: dto.cancelUrl,
        });

        return { url: session.url };
    }

    @Get('me')
    async getMySubscription(@Req() req: any) {
        const user = req.user;
        const subscription = await this.prisma.subscription.findFirst({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'desc' },
        });

        console.log(`[DEBUG] Fetching subscription for org ${user.organizationId}:`, subscription);

        return {
            organizationId: user.organizationId,
            subscription: subscription ? {
                id: subscription.id,
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd,
                isActive: subscription.status === 'ACTIVE',
            } : null,
        };
    }
}
