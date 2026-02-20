import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_FEATURE_KEY } from '../decorators/plan.decorator';
import { PLAN_LIMITS, PlanFeature } from '../constants/plan-limits.constant';
import { GetSubscriptionStatusUseCase } from '../../modules/subscription/application/get-subscription-status.usecase';

/**
 * FeatureFlagGuard — Presentation layer guard.
 *
 * Checks if the organization's current plan includes the required feature.
 * Must be used in conjunction with @RequireFeature() decorator.
 *
 * Example: Only PRO and ENTERPRISE plans can access Advanced Analytics.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.getAllAndOverride<PlanFeature>(
            REQUIRE_FEATURE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredFeature) {
            // If no feature is forced, let everyone through
            return true;
        }

        const http = context.switchToHttp();
        const request = http.getRequest<Request>();

        // Organization ID string retrieved from request/headers
        const organizationId =
            (request as any).organizationId ??
            (request.headers['x-organization-id'] as string | undefined) ??
            (request.headers['organization-id'] as string | undefined);

        if (!organizationId) {
            throw new ForbiddenException('Organization ID header is required');
        }

        // Delegate to Application Layer to retrieve plan status
        const status = await this.getSubscriptionStatusUseCase.execute(
            organizationId as string,
        );

        if (!status.active || !status.plan) {
            throw new ForbiddenException('Active subscription is required to access feature');
        }

        // Look up features allowed in this plan without executing business logic,
        // just array checking.
        const planLimits = PLAN_LIMITS[status.plan];

        if (!(planLimits.features as readonly PlanFeature[]).includes(requiredFeature)) {
            throw new ForbiddenException(
                `Plan '${status.plan}' does not support feature '${requiredFeature}'. Please upgrade your subscription.`
            );
        }

        return true;
    }
}
