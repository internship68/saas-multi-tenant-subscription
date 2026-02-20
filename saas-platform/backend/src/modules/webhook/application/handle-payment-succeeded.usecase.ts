import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';
import {
    SubscriptionPlan,
} from '../../subscription/domain/subscription.entity';

export interface HandlePaymentSucceededCommand {
    organizationId: string;
    plan: string;
    durationInDays: number;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    amountReceived: number;
    currency: string;
}

/**
 * Application Use Case — handles payment_intent.succeeded from Stripe.
 *
 * Business logic:
 *  - If organization has an active subscription → upgrade plan
 *  - If no subscription or inactive → this should not happen (guard upstream)
 *    but we handle gracefully by logging a warning
 *
 * Layer contract:
 *  - No Stripe SDK or Stripe types here.
 *  - Receives clean command data extracted by StripeService (Infrastructure).
 *  - Calls only Domain entity methods.
 */
@Injectable()
export class HandlePaymentSucceededUseCase {
    private readonly logger = new Logger(HandlePaymentSucceededUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
    ) { }

    async execute(command: HandlePaymentSucceededCommand): Promise<void> {
        if (!command.organizationId) {
            throw new BadRequestException(
                'organizationId is required in Stripe metadata for payment.succeeded event',
            );
        }

        const subscription = await this.repository.findByOrganizationId(
            command.organizationId,
        );

        if (!subscription) {
            // This can happen if webhook arrives before our system creates the record
            // Log and let BullMQ retry — subscription may appear shortly
            this.logger.warn(
                `No subscription found for org ${command.organizationId} on payment.succeeded. ` +
                `Will rely on BullMQ retry.`,
            );
            throw new NotFoundException(
                `Subscription not found for organization: ${command.organizationId}`,
            );
        }

        // Resolve plan — default to PRO if Stripe metadata has unknown value
        const planMap: Record<string, SubscriptionPlan> = {
            FREE: SubscriptionPlan.FREE,
            PRO: SubscriptionPlan.PRO,
            ENTERPRISE: SubscriptionPlan.ENTERPRISE,
        };
        const plan = planMap[command.plan.toUpperCase()] ?? SubscriptionPlan.PRO;

        // Business rule lives in the entity
        subscription.upgradeTo(plan, command.durationInDays);
        await this.repository.save(subscription);

        this.logger.log(
            `[PaymentSucceeded] Org ${command.organizationId} upgraded to ${plan} ` +
            `for ${command.durationInDays} days. ` +
            `(Stripe sub: ${command.stripeSubscriptionId}, ` +
            `amount: ${command.amountReceived} ${command.currency})`,
        );
    }
}
