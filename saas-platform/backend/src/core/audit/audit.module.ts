import { Module, Global } from '@nestjs/common';
import { PrismaAuditLogRepository } from './infrastructure/prisma-audit-log.repository';
import { AuditLogListener } from './application/audit-log.listener';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: 'AuditLogRepository',
            useClass: PrismaAuditLogRepository,
        },
        AuditLogListener,
    ],
    exports: ['AuditLogRepository'],
})
export class AuditModule { }
