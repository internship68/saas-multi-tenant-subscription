import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';

export interface HandleInvoiceFailedCommand {
    organizationId: string;
    stripeInvoiceId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    amountDue: number;
    currency: string;
    /** Number of payment attempts Stripe has made */
    attemptCount: number;
}

export interface HandleInvoiceFailedResult {
    organizationId: string;
    action: 'logged' | 'grace_period_applied' | 'subscription_expired';
    attemptCount: number;
}

/**
 * Application Use Case — handles invoice.payment_failed from Stripe.
 *
 * Business logic (current skeleton — expandable per-phase):
 *  1st failure  → log warning, send notification (TODO)
 *  2nd failure  → log escalated warning (TODO: apply grace period)
 *  3rd+ failure → expire the subscription (domain rule)
 *
 * Layer contract:
 *  - No Stripe SDK or types.
 *  - Receives clean command from StripeService.
 *  - Uses domain entity expire() for hard failures.
 *
 * TODO (future phases):
 *  - Trigger email notification via NotificationService
 *  - Apply dunning logic (grace period with reduced plan)
 *  - Integrate with billing retry schedule
 */
@Injectable()
export class HandleInvoiceFailedUseCase {
    private readonly logger = new Logger(HandleInvoiceFailedUseCase.name);

    // Retry threshold before forcing subscription expiration
    private readonly MAX_RETRIES_BEFORE_EXPIRE = 3;

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
    ) { }

    async execute(
        command: HandleInvoiceFailedCommand,
    ): Promise<HandleInvoiceFailedResult> {
        if (!command.organizationId) {
            throw new BadRequestException(
                'organizationId is required in Stripe metadata for invoice.payment_failed event',
            );
        }

        const subscription = await this.repository.findByOrganizationId(
            command.organizationId,
        );

        if (!subscription) {
            throw new NotFoundException(
                `Subscription not found for organization: ${command.organizationId}`,
            );
        }

        this.logger.warn(
            `[InvoiceFailed] Org ${command.organizationId} — ` +
            `invoice ${command.stripeInvoiceId}, ` +
            `amount: ${command.amountDue} ${command.currency}, ` +
            `attempt #${command.attemptCount}`,
        );

        // Hard failure threshold: expire the subscription
        if (command.attemptCount >= this.MAX_RETRIES_BEFORE_EXPIRE) {
            // Business rule in entity — expire() throws if not active
            subscription.expire();
            await this.repository.save(subscription);

            this.logger.error(
                `[InvoiceFailed] Org ${command.organizationId} subscription EXPIRED ` +
                `after ${command.attemptCount} failed payment attempts.`,
            );

            return {
                organizationId: command.organizationId,
                action: 'subscription_expired',
                attemptCount: command.attemptCount,
            };
        }

        // Soft failure: log and escalate
        // TODO Phase: send dunning email, apply grace period plan
        this.logger.warn(
            `[InvoiceFailed] Org ${command.organizationId} — ` +
            `attempt ${command.attemptCount}/${this.MAX_RETRIES_BEFORE_EXPIRE}. ` +
            `Dunning notification pending (TODO).`,
        );

        return {
            organizationId: command.organizationId,
            action: 'logged',
            attemptCount: command.attemptCount,
        };
    }
}
