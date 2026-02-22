import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetNotificationsUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(organizationId: string) {
        // ใช้ Raw SQL เพื่อดึงข้อมูลให้ครบถ้วนที่สุดรวมถึงคอลัมน์ isRead ที่ Prisma Client อาจจะยังไม่รู้จัก
        const logs: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "AuditLog" 
             WHERE "organizationId" = $1 
             AND action IN ('NEW_LINE_LEAD', 'RETURNING_LINE_LEAD')
             ORDER BY "createdAt" DESC 
             LIMIT 10`,
            organizationId
        );

        return logs.map(log => {
            const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
            const isNew = log.action === 'NEW_LINE_LEAD';

            return {
                id: log.id,
                title: isNew ? '✨ มีลูกค้าใหม่ทัก LINE!' : '💬 ลูกค้าเก่าทักกลับมา',
                description: `คุณ ${metadata?.displayName || 'ลูกค้า'} ทักมาว่า: "${metadata?.text || '-'}"`,
                time: log.createdAt,
                leadId: log.entityId,
                isRead: log.isRead,
            };
        });
    }
}
