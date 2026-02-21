import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';
import { SubscriptionPlan } from '../../subscription/domain/subscription.entity';
import { PaymentRepository } from '../../payment/domain/payment.repository.interface';
import { Payment, PaymentStatus } from '../../payment/domain/payment.entity';
import { SubscriptionChangedEvent } from '../../subscription/domain/events/subscription-changed.event';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface HandlePaymentSucceededCommand {
    organizationId: string;
    plan: string;
    durationInDays: number;
    stripePaymentIntentId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    amountReceived: number;
    currency: string;
}

/**
 * Application Use Case — handles payment_intent.succeeded from Stripe.
 *
 * Transactional guarantee:
 *   subscription update + payment record written in a single Prisma $transaction.
 *   If either fails, both are rolled back.
 */
@Injectable()
export class HandlePaymentSucceededUseCase {
    private readonly logger = new Logger(HandlePaymentSucceededUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly subscriptionRepo: SubscriptionRepository,
        @Inject('PaymentRepository')
        private readonly paymentRepo: PaymentRepository,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async execute(command: HandlePaymentSucceededCommand): Promise<void> {
        if (!command.organizationId) {
            throw new BadRequestException(
                'organizationId is required in Stripe metadata for payment.succeeded event',
            );
        }

        const subscription = await this.subscriptionRepo.findByOrganizationId(
            command.organizationId,
        );

        if (!subscription) {
            this.logger.warn({
                msg: 'Subscription not found — will retry',
                organization_id: command.organizationId,
                stripe_event_type: 'payment_intent.succeeded',
            });
            throw new NotFoundException(
                `Subscription not found for organization: ${command.organizationId}`,
            );
        }

        const planMap: Record<string, SubscriptionPlan> = {
            FREE: SubscriptionPlan.FREE,
            PRO: SubscriptionPlan.PRO,
            ENTERPRISE: SubscriptionPlan.ENTERPRISE,
        };
        const newPlan = planMap[command.plan.toUpperCase()] ?? SubscriptionPlan.PRO;
        const oldPlan = subscription.getPlan();

        // Domain state machine validates the transition
        subscription.upgradeTo(newPlan, command.durationInDays);

        const subData = subscription.toJSON();
        const payment = Payment.create({
            organizationId: command.organizationId,
            subscriptionId: subscription.getId(),
            amount: command.amountReceived,
            currency: command.currency,
            status: PaymentStatus.SUCCEEDED,
            providerPaymentId: command.stripePaymentIntentId,
        });
        const payData = payment.toJSON();

        // ── Atomic transaction: subscription + payment ─────────────────────
        // Serializable isolation prevents lost updates when two workers
        // concurrently process events for the same subscription.
        await this.prisma.$transaction(async (tx) => {
            await tx.subscription.upsert({
                where: { id: subData.id },
                create: subData,
                update: subData,
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

        // Emit domain event for audit log (outside transaction — fire and forget)
        this.eventEmitter.emit(
            'domain.subscription.changed',
            new SubscriptionChangedEvent(
                command.organizationId,
                subscription.getId(),
                'UPGRADED',
                {
                    old_plan: oldPlan,
                    new_plan: newPlan,
                    amount: command.amountReceived,
                    currency: command.currency,
                    stripe_subscription_id: command.stripeSubscriptionId,
                },
            ),
        );

        this.logger.log({
            msg: 'Payment succeeded — subscription upgraded',
            organization_id: command.organizationId,
            subscription_id: subscription.getId(),
            old_plan: oldPlan,
            new_plan: newPlan,
            amount: command.amountReceived,
            currency: command.currency,
        });
    }
}
