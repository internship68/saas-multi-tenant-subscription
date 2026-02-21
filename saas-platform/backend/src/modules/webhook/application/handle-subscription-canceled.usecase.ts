import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';
import { SubscriptionChangedEvent } from '../../subscription/domain/events/subscription-changed.event';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface HandleSubscriptionCanceledCommand {
    organizationId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
}

/**
 * Application Use Case — handles customer.subscription.deleted from Stripe.
 *
 * Transactional guarantee:
 *  subscription update written atomically via Prisma $transaction.
 */
@Injectable()
export class HandleSubscriptionCanceledUseCase {
    private readonly logger = new Logger(HandleSubscriptionCanceledUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async execute(command: HandleSubscriptionCanceledCommand): Promise<void> {
        if (!command.organizationId) {
            throw new BadRequestException(
                'organizationId is required in Stripe metadata for subscription.deleted event',
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

        const oldPlan = subscription.getPlan();
        const subId = subscription.getId();

        // State machine validates: ACTIVE → CANCELED (throws InvalidTransitionError otherwise)
        subscription.cancel();

        const subData = subscription.toJSON();

        await this.prisma.$transaction(async (tx) => {
            await tx.subscription.update({
                where: { id: subId },
                data: { status: subData.status },
            });
        }, { isolationLevel: 'Serializable' });

        this.eventEmitter.emit(
            'domain.subscription.changed',
            new SubscriptionChangedEvent(
                command.organizationId,
                subId,
                'CANCELED',
                {
                    plan: oldPlan,
                    stripe_subscription_id: command.stripeSubscriptionId,
                    stripe_customer_id: command.stripeCustomerId,
                },
            ),
        );

        this.logger.log({
            msg: 'Subscription canceled',
            organization_id: command.organizationId,
            subscription_id: subId,
            plan: oldPlan,
            stripe_subscription_id: command.stripeSubscriptionId,
        });
    }
}
