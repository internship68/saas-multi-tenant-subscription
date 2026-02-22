import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListLeadsUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(organizationId: string) {
        const leads = await this.prisma.lineLead.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });

        return leads.map(lead => ({
            id: lead.id,
            name: lead.studentName || 'ลูกค้าใหม่ (รอชื่อ)',
            grade: lead.grade || '-',
            course: lead.courseInterest || '-',
            phone: lead.phone || '-',
            status: lead.status,
            createdAt: lead.createdAt,
        }));
    }
}
