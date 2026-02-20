export enum PlanFeature {
    BASIC_ACCESS = 'BASIC_ACCESS',
    CUSTOM_DOMAIN = 'CUSTOM_DOMAIN',
    PRIORITY_SUPPORT = 'PRIORITY_SUPPORT',
    ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS',
}

export const PLAN_LIMITS = {
    FREE: {
        maxUsers: 3,
        maxProjects: 1,
        features: [PlanFeature.BASIC_ACCESS],
    },
    PRO: {
        maxUsers: 10,
        maxProjects: 5,
        features: [
            PlanFeature.BASIC_ACCESS,
            PlanFeature.CUSTOM_DOMAIN,
            PlanFeature.ADVANCED_ANALYTICS,
        ],
    },
    ENTERPRISE: {
        maxUsers: Infinity,
        maxProjects: Infinity,
        features: [
            PlanFeature.BASIC_ACCESS,
            PlanFeature.CUSTOM_DOMAIN,
            PlanFeature.ADVANCED_ANALYTICS,
            PlanFeature.PRIORITY_SUPPORT,
        ],
    },
} as const;
