import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Inject,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionRepository } from '../../core/subscription/domain/subscription.repository.interface';
import { UsageRepository } from '../../core/usage/domain/usage.repository.interface';

@Injectable()
export class PlanLimitGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject('SubscriptionRepository')
        private readonly subscriptionRepository: SubscriptionRepository,
        @Inject('UsageRepository')
        private readonly usageRepository: UsageRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.organizationId) {
            throw new ForbiddenException('User or organization not found in request');
        }

        const usageType = this.reflector.get<string>('usageType', context.getHandler()) || 'API_CALLS';

        // 1. Get Active Subscription
        const subscription = await this.subscriptionRepository.findByOrganizationId(user.organizationId);
        if (!subscription || !subscription.isActive()) {
            throw new ForbiddenException('ACTIVE subscription required');
        }

        // 2. Check Usage
        const usage = await this.usageRepository.findByOrganizationIdAndType(user.organizationId, usageType);

        if (usage && usage.isExceeded()) {
            throw new ForbiddenException(`Usage limit exceeded for ${usageType}. Please upgrade your plan.`);
        }

        return true;
    }
}
