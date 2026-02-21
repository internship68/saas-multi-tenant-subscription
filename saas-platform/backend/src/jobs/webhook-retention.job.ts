import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma/prisma.service';

/**
 * WebhookRetentionJob — runs daily at 3 AM to delete processed/ignored
 * webhook events older than 90 days.
 *
 * FAILED events are kept indefinitely so operators can inspect and replay them.
 * Adjust RETENTION_DAYS or the WHERE clause as your compliance requires.
 */
@Injectable()
export class WebhookRetentionJob {
    private readonly logger = new Logger(WebhookRetentionJob.name);
    private readonly RETENTION_DAYS = 90;

    constructor(private readonly prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupOldEvents() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

        const result = await this.prisma.webhookEvent.deleteMany({
            where: {
                receivedAt: { lt: cutoffDate },
                status: { in: ['PROCESSED', 'IGNORED', 'UNHANDLED'] },
            },
        });

        this.logger.log({
            msg: 'Webhook retention cleanup completed',
            deleted_count: result.count,
            cutoff_date: cutoffDate.toISOString(),
            retention_days: this.RETENTION_DAYS,
        });
    }
}
