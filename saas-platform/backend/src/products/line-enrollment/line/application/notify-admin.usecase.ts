import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface NotifyAdminPayload {
    organizationId: string;
    leadId: string;
    studentName: string | null;
    gradeLevel: string | null;
    interestedSubject: string | null;
    phoneNumber: string | null;
    score: number;
}

@Injectable()
export class NotifyAdminUseCase {
    private readonly logger = new Logger(NotifyAdminUseCase.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(payload: NotifyAdminPayload): Promise<boolean> {
        const { organizationId, leadId, studentName, gradeLevel, interestedSubject, phoneNumber, score } = payload;

        // 1. Get Integration to find LINE Notify token
        const integration = await this.prisma.lineIntegration.findFirst({
            where: { organizationId }
        });

        if (!(integration as any)?.adminNotifyToken) {
            this.logger.warn(`No LINE Notify token found for organization ${organizationId}. Skipping notification.`);
            return false;
        }

        const scoreText = Math.round(score * 100);
        const emoji = scoreText >= 70 ? '🔥' : scoreText >= 40 ? '🟡' : '⚪';

        const message = `
${emoji} มี Lead ใหม่พร้อมติดต่อ!

👤 ชื่อนักเรียน: ${studentName || 'ไม่ระบุ'}
📚 ระดับชั้น: ${gradeLevel || 'ไม่ระบุ'}
🎯 วิชาที่สนใจ: ${interestedSubject || 'ไม่ระบุ'}
📞 เบอร์โทร: ${phoneNumber || 'ไม่ระบุ'}
📈 คะแนนความร้อน: ${scoreText}/100

🚀 รีบติดต่อกลับเพื่อปิดการขายนะคะ!
`.trim();

        try {
            await axios.post(
                'https://notify-api.line.me/api/notify',
                `message=${encodeURIComponent(message)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${(integration as any).adminNotifyToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );

            this.logger.log(`Successfully notified admin for lead ${leadId}`);
            return true;
        } catch (err: any) {
            this.logger.error(`Failed to send LINE Notify for lead ${leadId}: ${err.message}`);
            return false;
        }
    }
}
