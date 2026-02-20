import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { UserRepository } from '../../user/domain/user.repository.interface';
import { User } from '../../user/domain/user.entity';

export interface ListMembersCommand {
    organizationId: string;
    requestorId: string; // To verify the requestor belongs to the same org
}

@Injectable()
export class ListMembersUseCase {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(command: ListMembersCommand): Promise<User[]> {
        // 1. Tenant Isolation: Verify the requestor belongs to the organization
        const requestor = await this.userRepository.findById(command.requestorId);
        if (!requestor || requestor.getOrganizationId() !== command.organizationId) {
            throw new ForbiddenException('You do not have permission to view members of this organization');
        }

        // 2. Fetch members
        return this.userRepository.findByOrganizationId(command.organizationId);
    }
}
