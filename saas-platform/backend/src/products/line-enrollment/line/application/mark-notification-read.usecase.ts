import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class MarkNotificationReadUseCase {
    private readonly logger = new Logger(MarkNotificationReadUseCase.name);
    constructor(private readonly prisma: PrismaService) { }

    async execute(organizationId: string, notificationId: string) {
        try {
            const log = await this.prisma.auditLog.findFirst({
                where: {
                    id: notificationId,
                    organizationId
                }
            });

            if (!log) {
                this.logger.warn(`Notification not found: ${notificationId} for org ${organizationId}`);
                throw new NotFoundException('Notification not found');
            }

            // ใช้ Raw SQL เพื่อข้ามผ่านปัญหา Prisma Client Types ไม่ถูก Generate
            await this.prisma.$executeRawUnsafe(
                `UPDATE "AuditLog" SET "isRead" = true WHERE id = $1 AND "organizationId" = $2`,
                notificationId,
                organizationId
            );

            return { success: true };
        } catch (err: any) {
            this.logger.error(`Failed to mark notification as read: ${err.message}`, err.stack);
            throw err;
        }
    }
}
