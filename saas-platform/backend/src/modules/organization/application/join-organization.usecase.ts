import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationRepository } from '../domain/invitation.repository.interface';
import { UserRepository } from '../../user/domain/user.repository.interface';
import { UserMembershipChangedEvent } from '../../user/domain/events/user-membership-changed.event';

export interface JoinOrganizationCommand {
    token: string;
    userId: string;
}

@Injectable()
export class JoinOrganizationUseCase {
    constructor(
        @Inject('InvitationRepository')
        private readonly invitationRepository: InvitationRepository,
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async execute(command: JoinOrganizationCommand): Promise<void> {
        const invitation = await this.invitationRepository.findByToken(command.token);
        if (!invitation || invitation.getStatus() !== 'PENDING') {
            throw new NotFoundException('Invalid or expired invitation token');
        }

        const user = await this.userRepository.findById(command.userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const oldOrgId = user.getOrganizationId();

        // Tenant isolation check: Ensure the email matches (optional but recommended)
        if (user.getEmail().toLowerCase() !== invitation.getEmail().toLowerCase()) {
            throw new BadRequestException('This invitation was sent to a different email address');
        }

        // ACCEPT invitation
        invitation.accept();
        await this.invitationRepository.save(invitation);

        // Update user's organization and role
        user.changeOrganization(invitation.getOrganizationId(), invitation.getRole() as any);
        await this.userRepository.save(user);

        // Emit audit event
        this.eventEmitter.emit(
            'domain.user_membership_changed',
            new UserMembershipChangedEvent(
                invitation.getOrganizationId(),
                user.getId(),
                'JOINED',
                { invitedBy: invitation.getEmail(), oldOrganizationId: oldOrgId }
            )
        );
    }
}
