import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { InvitationRepository } from '../domain/invitation.repository.interface';
import { Invitation } from '../domain/invitation.entity';

@Injectable()
export class PrismaInvitationRepository implements InvitationRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(invitation: Invitation): Promise<void> {
        const data = invitation.toJSON();
        await this.prisma.invitation.upsert({
            where: { id: data.id },
            create: data,
            update: data,
        });
    }

    async findByToken(token: string): Promise<Invitation | null> {
        const model = await this.prisma.invitation.findUnique({
            where: { token },
        });

        if (!model) return null;

        return Invitation.restore({
            id: model.id,
            email: model.email,
            organizationId: model.organizationId,
            token: model.token,
            role: model.role,
            status: model.status as 'PENDING' | 'ACCEPTED',
            createdAt: model.createdAt,
        });
    }

    async findByEmailAndOrganization(email: string, organizationId: string): Promise<Invitation | null> {
        const model = await this.prisma.invitation.findUnique({
            where: {
                email_organizationId: {
                    email: email.toLowerCase(),
                    organizationId,
                },
            },
        });

        if (!model) return null;

        return Invitation.restore({
            id: model.id,
            email: model.email,
            organizationId: model.organizationId,
            token: model.token,
            role: model.role,
            status: model.status as 'PENDING' | 'ACCEPTED',
            createdAt: model.createdAt,
        });
    }
}
