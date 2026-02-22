import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class TakeoverLeadUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(organizationId: string, lineUserId: string) {
        const conversation = await this.prisma.lineConversation.findUnique({
            where: {
                organizationId_lineUserId: {
                    organizationId,
                    lineUserId,
                },
            },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        return this.prisma.lineConversation.update({
            where: { id: conversation.id },
            data: {
                state: 'HANDOVER_TO_ADMIN',
            },
        });
    }
}
