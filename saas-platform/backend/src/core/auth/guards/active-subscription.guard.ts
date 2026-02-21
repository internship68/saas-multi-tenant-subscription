import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/**
 * Entitlement Guard
 *
 * Placed AFTER JwtAuthGuard. It reads the user's organization and
 * blocks the request if the organization does NOT have an ACTIVE subscription.
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
    private readonly logger = new Logger(ActiveSubscriptionGuard.name);

    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.organizationId) {
            // Probably JwtAuthGuard wasn't applied or failed
            return false;
        }

        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId: user.organizationId,
                status: 'ACTIVE',
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        if (!subscription) {
            this.logger.warn({
                msg: 'Entitlement Blocked — No active subscription',
                user_id: user.userId,
                organization_id: user.organizationId,
            });
            throw new ForbiddenException(
                'Active subscription required to access this feature',
            );
        }

        // Add subscription to request for further use if needed down the line
        request.subscription = subscription;

        return true;
    }
}
