import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Inject,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionRepository } from '../../modules/subscription/domain/subscription.repository.interface';
import { SubscriptionPlan } from '../../modules/subscription/domain/subscription.entity';
import { PLAN_LIMITS } from '../../modules/usage/domain/plan-limits.constants';

@Injectable()
export class FeatureGateGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject('SubscriptionRepository')
        private readonly subscriptionRepository: SubscriptionRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const feature = this.reflector.get<string>('feature', context.getHandler());
        if (!feature) {
            return true; // No feature gate defined
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.organizationId) {
            throw new ForbiddenException('User or organization not found in request');
        }

        // 1. Get Active Subscription
        const subscription = await this.subscriptionRepository.findByOrganizationId(user.organizationId);
        if (!subscription || !subscription.isActive()) {
            throw new ForbiddenException('ACTIVE subscription required to access this feature');
        }

        // 2. Check if plan supports feature
        const plan = subscription.getPlan() as SubscriptionPlan;
        const planLimits = PLAN_LIMITS[plan];
        if (!planLimits.features.includes(feature)) {
            throw new ForbiddenException(`Your plan (${subscription.getPlan()}) does not include the "${feature}" feature.`);
        }

        return true;
    }
}
