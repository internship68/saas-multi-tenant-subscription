import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { SubscriptionRepository } from '../../subscription/domain/subscription.repository.interface';

export interface HandleSubscriptionCanceledCommand {
    organizationId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
}

/**
 * Application Use Case — handles customer.subscription.deleted from Stripe.
 *
 * Business logic:
 *  - Find the organization's active subscription
 *  - Call domain entity cancel() method
 *  - Persist
 *
 * Layer contract:
 *  - No Stripe SDK or Stripe types.
 *  - Calls only Domain entity methods.
 *  - If subscription not found, throws so BullMQ can retry.
 */
@Injectable()
export class HandleSubscriptionCanceledUseCase {
    private readonly logger = new Logger(HandleSubscriptionCanceledUseCase.name);

    constructor(
        @Inject('SubscriptionRepository')
        private readonly repository: SubscriptionRepository,
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

        // Business rule lives in the entity — cancel() throws if already canceled
        subscription.cancel();
        await this.repository.save(subscription);

        this.logger.log(
            `[SubscriptionCanceled] Org ${command.organizationId} subscription canceled. ` +
            `(Stripe sub: ${command.stripeSubscriptionId}, customer: ${command.stripeCustomerId})`,
        );
    }
}
