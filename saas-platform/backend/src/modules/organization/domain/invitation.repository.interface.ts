import { Invitation } from './invitation.entity';

export interface InvitationRepository {
    save(invitation: Invitation): Promise<void>;
    findByToken(token: string): Promise<Invitation | null>;
    findByEmailAndOrganization(email: string, organizationId: string): Promise<Invitation | null>;
}
