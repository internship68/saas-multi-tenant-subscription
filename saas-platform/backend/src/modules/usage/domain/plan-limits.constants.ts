import { SubscriptionPlan } from '../../subscription/domain/subscription.entity';

export interface PlanLimit {
    maxUsers: number;
    apiCallsLimit: number;
    features: string[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimit> = {
    [SubscriptionPlan.FREE]: {
        maxUsers: 5,
        apiCallsLimit: 100, // Small for testing
        features: ['basic_reports'],
    },
    [SubscriptionPlan.PRO]: {
        maxUsers: 50,
        apiCallsLimit: 10000,
        features: ['basic_reports', 'advanced_analytics', 'custom_branding'],
    },
    [SubscriptionPlan.ENTERPRISE]: {
        maxUsers: 999999,
        apiCallsLimit: 1000000,
        features: ['basic_reports', 'advanced_analytics', 'custom_branding', 'audit_logs', 'sso'],
    },
};
