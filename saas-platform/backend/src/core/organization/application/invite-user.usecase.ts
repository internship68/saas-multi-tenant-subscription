import { Inject, Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { Invitation } from '../domain/invitation.entity';
import { InvitationRepository } from '../domain/invitation.repository.interface';
import { UserRepository } from '../../user/domain/user.repository.interface';

export interface InviteUserCommand {
    organizationId: string;
    email: string;
    role: string;
    inviterId: string; // To check if inviter has permission
}

@Injectable()
export class InviteUserUseCase {
    constructor(
        @Inject('InvitationRepository')
        private readonly invitationRepository: InvitationRepository,
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(command: InviteUserCommand): Promise<{ token: string }> {
        // 1. Check if user is already in this organization
        const user = await this.userRepository.findByEmail(command.email);
        if (user && user.getOrganizationId() === command.organizationId) {
            throw new ConflictException('User is already a member of this organization');
        }

        // 2. Check if a pending invitation already exists
        const existingInvitation = await this.invitationRepository.findByEmailAndOrganization(
            command.email,
            command.organizationId,
        );
        if (existingInvitation && existingInvitation.getStatus() === 'PENDING') {
            return { token: existingInvitation.getToken() };
        }

        // 3. Create new invitation
        const invitation = Invitation.create(command.email, command.organizationId, command.role);
        await this.invitationRepository.save(invitation);

        // In a real app, send email here. For now, just return token.
        return { token: invitation.getToken() };
    }
}
