import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListLeadsUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(organizationId: string) {
        const leads = await this.prisma.lineLead.findMany({
            where: { organizationId },
            orderBy: [
                { score: 'desc' } as any,
                { createdAt: 'desc' } as any
            ],
        });

        return leads.map((lead: any) => ({
            id: lead.id,
            lineUserId: lead.lineUserId,
            name: lead.studentName || 'ลูกค้าใหม่ (รอชื่อ)',
            grade: lead.gradeLevel || '-',
            course: lead.interestedSubject || '-',
            phone: lead.phoneNumber || '-',
            status: lead.status,
            score: lead.score || 0,
            aiConfidence: lead.aiConfidence || 0,
            notifiedAt: lead.notifiedAt,
            createdAt: lead.createdAt,
        }));
    }
}
