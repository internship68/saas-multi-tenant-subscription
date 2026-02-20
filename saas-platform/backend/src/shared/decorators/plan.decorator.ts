import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '../constants/plan-limits.constant';
import { SubscriptionPlan } from '../../modules/subscription/domain/subscription.entity';

export const REQUIRE_PLAN_KEY = 'requirePlan';
export const RequirePlan = (plan: SubscriptionPlan) =>
    SetMetadata(REQUIRE_PLAN_KEY, plan);

export const REQUIRE_FEATURE_KEY = 'requireFeature';
export const RequireFeature = (feature: PlanFeature) =>
    SetMetadata(REQUIRE_FEATURE_KEY, feature);

export const REQUIRE_LIMIT_CHECK_KEY = 'requireLimitCheck';
export const RequireLimitCheck = (resource: 'users' | 'projects') =>
    SetMetadata(REQUIRE_LIMIT_CHECK_KEY, resource);
