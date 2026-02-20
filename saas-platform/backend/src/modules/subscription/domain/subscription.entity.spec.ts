import { Subscription, SubscriptionPlan, SubscriptionStatus } from './subscription.entity';

describe('Subscription Entity', () => {
    const orgId = 'org-123';

    describe('createFree', () => {
        it('should create a free subscription with 30 days duration', () => {
            const subscription = Subscription.createFree(orgId);

            expect(subscription.getId()).toBeDefined();
            expect(subscription.getOrganizationId()).toBe(orgId);
            expect(subscription.getPlan()).toBe(SubscriptionPlan.FREE);
            expect(subscription.getStatus()).toBe(SubscriptionStatus.ACTIVE);

            const start = subscription.getCurrentPeriodStart();
            const end = subscription.getCurrentPeriodEnd();

            // Check if diff is roughly 30 days
            const diffInDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(30);
        });

        it('should throw error if organizationId is empty', () => {
            expect(() => Subscription.createFree('')).toThrow('Organization ID is required');
            expect(() => Subscription.createFree('   ')).toThrow('Organization ID is required');
        });
    });

    describe('create', () => {
        it('should create a subscription with specified plan and duration', () => {
            const subscription = Subscription.create(orgId, SubscriptionPlan.PRO, 15);

            expect(subscription.getPlan()).toBe(SubscriptionPlan.PRO);
            const start = subscription.getCurrentPeriodStart();
            const end = subscription.getCurrentPeriodEnd();
            const diffInDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(15);
        });

        it('should throw error for invalid organizationId', () => {
            expect(() => Subscription.create('', SubscriptionPlan.PRO, 10)).toThrow('Organization ID is required');
        });

        it('should throw error for invalid plan', () => {
            expect(() => Subscription.create(orgId, 'INVALID' as any, 10)).toThrow('Invalid plan type');
        });

        it('should throw error for non-positive duration', () => {
            expect(() => Subscription.create(orgId, SubscriptionPlan.PRO, 0)).toThrow('Duration in days must be greater than 0');
            expect(() => Subscription.create(orgId, SubscriptionPlan.PRO, -1)).toThrow('Duration in days must be greater than 0');
        });
    });

    describe('cancel', () => {
        it('should change status to CANCELED for an active subscription', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.cancel();
            expect(subscription.getStatus()).toBe(SubscriptionStatus.CANCELED);
        });

        it('should throw error if subscription is not active', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.cancel(); // Now canceled
            expect(() => subscription.cancel()).toThrow('Can only cancel active subscriptions');
        });
    });

    describe('expire', () => {
        it('should change status to EXPIRED for an active subscription', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.expire();
            expect(subscription.getStatus()).toBe(SubscriptionStatus.EXPIRED);
        });

        it('should throw error if subscription is not active', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.expire(); // Now expired
            expect(() => subscription.expire()).toThrow('Can only expire active subscriptions');
        });
    });

    describe('isActive', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return true if active and within period', () => {
            const now = new Date('2024-01-01T10:00:00Z');
            jest.setSystemTime(now);

            // Create subscription starting now, ending in 30 days
            const subscription = Subscription.createFree(orgId);

            expect(subscription.isActive()).toBe(true);
        });

        it('should return false if status is CANCELED', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.cancel();
            expect(subscription.isActive()).toBe(false);
        });

        it('should return false if status is EXPIRED', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.expire();
            expect(subscription.isActive()).toBe(false);
        });

        it('should return false if current time is after period end', () => {
            const now = new Date('2024-01-01T10:00:00Z');
            jest.setSystemTime(now);

            const subscription = Subscription.create(orgId, SubscriptionPlan.PRO, 1); // 1 day

            // Advance time by 2 days
            jest.setSystemTime(new Date('2024-01-03T10:00:00Z'));

            expect(subscription.isActive()).toBe(false);
        });

        it('should return false if current time is before period start', () => {
            const now = new Date('2024-01-01T10:00:00Z');
            jest.setSystemTime(now);

            const subscription = Subscription.create(orgId, SubscriptionPlan.PRO, 1);

            // Mock past date (this is unlikely in real world but covers the branch)
            jest.setSystemTime(new Date('2023-12-31T10:00:00Z'));

            expect(subscription.isActive()).toBe(false);
        });
    });

    describe('upgradeTo', () => {
        it('should upgrade plan and reset period', () => {
            const subscription = Subscription.createFree(orgId);
            const oldEndDate = subscription.getCurrentPeriodEnd();

            // Wait a bit or use fake timers to ensure "now" is different
            jest.useFakeTimers();
            jest.advanceTimersByTime(1000);

            subscription.upgradeTo(SubscriptionPlan.ENTERPRISE, 365);

            expect(subscription.getPlan()).toBe(SubscriptionPlan.ENTERPRISE);
            expect(subscription.getStatus()).toBe(SubscriptionStatus.ACTIVE);
            expect(subscription.getCurrentPeriodEnd().getTime()).not.toBe(oldEndDate.getTime());

            const diffInDays = Math.round((subscription.getCurrentPeriodEnd().getTime() - subscription.getCurrentPeriodStart().getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(365);

            jest.useRealTimers();
        });

        it('should throw error if subscription is not active', () => {
            const subscription = Subscription.createFree(orgId);
            subscription.cancel();
            expect(() => subscription.upgradeTo(SubscriptionPlan.PRO, 30)).toThrow('Can only upgrade active subscriptions');
        });

        it('should throw error for invalid plan', () => {
            const subscription = Subscription.createFree(orgId);
            expect(() => subscription.upgradeTo('INVALID' as any, 30)).toThrow('Invalid plan type');
        });

        it('should throw error if upgrading to the same plan', () => {
            const subscription = Subscription.createFree(orgId);
            expect(() => subscription.upgradeTo(SubscriptionPlan.FREE, 30)).toThrow('Cannot upgrade to the same plan');
        });

        it('should throw error for non-positive duration', () => {
            const subscription = Subscription.createFree(orgId);
            expect(() => subscription.upgradeTo(SubscriptionPlan.PRO, 0)).toThrow('Duration in days must be greater than 0');
        });
    });

    describe('restore and toJSON', () => {
        it('should restore from JSON/props correctly', () => {
            const id = 'sub-1';
            const created = new Date('2023-01-01');
            const start = new Date('2023-02-01');
            const end = new Date('2023-03-01');

            const subscription = Subscription.restore({
                id,
                organizationId: orgId,
                plan: SubscriptionPlan.PRO,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: start,
                currentPeriodEnd: end,
                createdAt: created,
            });

            expect(subscription.getId()).toBe(id);
            expect(subscription.getOrganizationId()).toBe(orgId);
            expect(subscription.getPlan()).toBe(SubscriptionPlan.PRO);
            expect(subscription.getStatus()).toBe(SubscriptionStatus.ACTIVE);
            expect(subscription.getCreatedAt()).toEqual(created);
            expect(subscription.getCurrentPeriodStart()).toEqual(start);
            expect(subscription.getCurrentPeriodEnd()).toEqual(end);

            expect(subscription.toJSON()).toEqual({
                id,
                organizationId: orgId,
                plan: SubscriptionPlan.PRO,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: start,
                currentPeriodEnd: end,
                createdAt: created,
            });
        });
    });

    describe('Edge Cases', () => {
        it('should throw error if endDate is not advanced (create)', () => {
            // endDate.setDate(now.getDate() + durationInDays)
            // If durationInDays is extremely small, setDate might not change the date.
            // Date.setDate(d + 0.0000001) -> Date.setDate(d)
            expect(() => Subscription.create(orgId, SubscriptionPlan.PRO, 1e-10)).toThrow('Current period end must be greater than current period start');
        });
    });
});
