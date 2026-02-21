import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';
import { PaymentRepository } from '../../payment/domain/payment.repository.interface';
import { Payment, PaymentStatus } from '../../payment/domain/payment.entity';
import { SubscriptionChangedEvent } from '../../subscription/domain/events/subscription-changed.event';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface HandleInvoiceFailedCommand {
    organizationId: string;
    stripeInvoiceId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    amountDue: number;
    currency: string;
    attemptCount: number;
}

export interface HandleInvoiceFailedResult {
    organizationId: string;
    action: 'logged' | 'subscription_expired';
    attemptCount: number;
}

/**
 * Application Use Case — handles invoice.payment_failed from Stripe.
 *
 * Transactional guarantee:
 *  payment record + (if applicable) subscription status update
 *  written atomically in a single Prisma $transaction.
 */
@Injectable()
export class HandleInvoiceFailedUseCase {
    private readonly logger = new Logger(HandleInvoiceFailedUseCase.name);
    private readonly MAX_RETRIES_BEFORE_EXPIRE = 3;

    constructor(
        @Inject('SubscriptionRepository')
        private readonly subscriptionRepo: SubscriptionRepository,
        @Inject('PaymentRepository')
        private readonly paymentRepo: PaymentRepository,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async execute(command: HandleInvoiceFailedCommand): Promise<HandleInvoiceFailedResult> {
        if (!command.organizationId) {
            throw new BadRequestException(
                'organizationId is required in Stripe metadata for invoice.payment_failed event',
            );
        }

        const subscription = await this.subscriptionRepo.findByOrganizationId(
            command.organizationId,
        );

        if (!subscription) {
            throw new NotFoundException(
                `Subscription not found for organization: ${command.organizationId}`,
            );
        }

        const subId = subscription.getId();
        const failedPayment = Payment.create({
            organizationId: command.organizationId,
            subscriptionId: subId,
            amount: command.amountDue,
            currency: command.currency,
            status: PaymentStatus.FAILED,
            providerPaymentId: command.stripeInvoiceId,
        });
        const payData = failedPayment.toJSON();

        this.logger.warn({
            msg: 'Invoice payment failed',
            organization_id: command.organizationId,
            subscription_id: subId,
            stripe_invoice_id: command.stripeInvoiceId,
            amount_due: command.amountDue,
            currency: command.currency,
            attempt_count: command.attemptCount,
            max_before_expire: this.MAX_RETRIES_BEFORE_EXPIRE,
        });

        // ── Hard failure: expire subscription ─────────────────────────────
        if (command.attemptCount >= this.MAX_RETRIES_BEFORE_EXPIRE) {
            // State machine validates: ACTIVE → EXPIRED
            subscription.expire();
            const subData = subscription.toJSON();

            await this.prisma.$transaction(async (tx) => {
                await tx.subscription.update({
                    where: { id: subId },
                    data: { status: subData.status },
                });
                await tx.payment.create({
                    data: {
                        id: payData.id,
                        organizationId: payData.organizationId,
                        subscriptionId: payData.subscriptionId,
                        amount: payData.amount,
                        currency: payData.currency,
                        status: payData.status,
                        providerPaymentId: payData.providerPaymentId,
                        createdAt: payData.createdAt,
                    },
                });
            }, { isolationLevel: 'Serializable' });

            this.eventEmitter.emit(
                'domain.subscription.changed',
                new SubscriptionChangedEvent(
                    command.organizationId, subId, 'EXPIRED',
                    {
                        reason: 'max_payment_failures',
                        attempt_count: command.attemptCount,
                        stripe_invoice_id: command.stripeInvoiceId,
                    },
                ),
            );

            this.logger.error({
                msg: 'Subscription EXPIRED — max payment failures reached',
                organization_id: command.organizationId,
                subscription_id: subId,
                attempt_count: command.attemptCount,
                stripe_invoice_id: command.stripeInvoiceId,
            });

            return { organizationId: command.organizationId, action: 'subscription_expired', attemptCount: command.attemptCount };
        }

        // ── Soft failure: record payment only ─────────────────────────────
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.create({
                data: {
                    id: payData.id,
                    organizationId: payData.organizationId,
                    subscriptionId: payData.subscriptionId,
                    amount: payData.amount,
                    currency: payData.currency,
                    status: payData.status,
                    providerPaymentId: payData.providerPaymentId,
                    createdAt: payData.createdAt,
                },
            });
        }, { isolationLevel: 'Serializable' });

        this.logger.warn({
            msg: 'Soft payment failure recorded — subscription still active',
            organization_id: command.organizationId,
            subscription_id: subId,
            attempt_count: command.attemptCount,
        });

        return { organizationId: command.organizationId, action: 'logged', attemptCount: command.attemptCount };
    }
}
