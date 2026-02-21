import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { GetSubscriptionStatusUseCase } from '../../core/subscription/application/get-subscription-status.usecase';

@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(
    private readonly getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    const organizationId =
      (request.headers['x-organization-id'] as string | undefined) ??
      (request.headers['organization-id'] as string | undefined);

    if (!organizationId) {
      throw new ForbiddenException('Organization ID header is required');
    }

    const status =
      await this.getSubscriptionStatusUseCase.execute(organizationId);

    if (!status.active) {
      throw new ForbiddenException('Subscription is not active');
    }

    (request as any).organizationId = organizationId;

    return true;
  }
}
