import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditLogRepository, AuditLogContent } from '../domain/audit-log.repository.interface';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(log: AuditLogContent): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                organizationId: log.organizationId,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                actorId: log.actorId,
                metadata: log.metadata as any,
            },
        });
    }
}
