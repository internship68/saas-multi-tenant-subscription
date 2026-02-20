import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_LIMIT_CHECK_KEY } from '../decorators/plan.decorator';
import { PLAN_LIMITS } from '../constants/plan-limits.constant';
import { GetSubscriptionStatusUseCase } from '../../modules/subscription/application/get-subscription-status.usecase';
import { GetCurrentUsageUseCase } from '../../modules/usage/application/get-current-usage.usecase';

/**
 * PlanLimitGuard — Presentation layer check.
 *
 * It prevents adding new resources if the allowed limit is already hit
 * exactly as requested in Clean Architecture context.
 *
 * E.g., @RequireLimitCheck('users') before a POST /users route.
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase,
        private readonly getCurrentUsageUseCase: GetCurrentUsageUseCase,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const resourceType = this.reflector.getAllAndOverride<'users' | 'projects'>(
            REQUIRE_LIMIT_CHECK_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!resourceType) return true;

        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const organizationId =
            (request as any).organizationId ??
            (request.headers['x-organization-id'] as string | undefined) ??
            (request.headers['organization-id'] as string | undefined);

        if (!organizationId) {
            throw new ForbiddenException('Organization ID header is required');
        }

        const orgIdStr = organizationId as string;

        const status = await this.getSubscriptionStatusUseCase.execute(orgIdStr);

        if (!status.active || !status.plan) {
            throw new ForbiddenException('Active subscription is required to add resources');
        }

        const planLimits = PLAN_LIMITS[status.plan];

        // Resolve which dimension limitation applies to this route checking
        const maxLimit =
            resourceType === 'users' ? planLimits.maxUsers : planLimits.maxProjects;

        // Fast-path if Infinity
        if (maxLimit === Infinity) return true;

        // Delegate to Application layer to get existing count without SQL / logic embedded in Guard
        const currentUsage = await this.getCurrentUsageUseCase.execute({
            organizationId: orgIdStr,
            resourceType,
        });

        if (currentUsage >= maxLimit) {
            throw new ForbiddenException(
                `Plan '${status.plan}' limits you to a maximum of ${maxLimit} ${resourceType}. Usage: ${currentUsage}. Please upgrade your subscription to expand limits.`
            );
        }

        return true;
    }
}
