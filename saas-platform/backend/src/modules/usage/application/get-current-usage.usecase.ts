import { Injectable } from '@nestjs/common';

export interface GetCurrentUsageCommand {
    organizationId: string;
    resourceType: 'users' | 'projects';
}

/**
 * Application Use Case — gets the current usage count for a specific resource.
 *
 * In a real-world scenario, this would query a UsageRepository, UserRepository,
 * or ProjectRepository to count the current entities.
 *
 * Layer contract:
 *  - No HTTP or Prisma specifics.
 *  - Returns clean data for guards or controllers to validate.
 */
@Injectable()
export class GetCurrentUsageUseCase {
    async execute(command: GetCurrentUsageCommand): Promise<number> {
        // ─── SKELETON IMPLEMENTATION ────────────────────────────
        // TODO: Inject actual repositories and count based on resourceType
        // e.g., if (resourceType === 'users') return this.userRepo.countByOrg(orgId);

        // Returning a mock value so the guards can be tested safely.
        return 1;
    }
}
