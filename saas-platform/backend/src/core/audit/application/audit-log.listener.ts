import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../../shared/domain/domain-event.base';
import { AuditLogRepository } from '../domain/audit-log.repository.interface';

@Injectable()
export class AuditLogListener {
    constructor(
        @Inject('AuditLogRepository')
        private readonly auditLogRepository: AuditLogRepository,
    ) { }

    @OnEvent('domain.*')
    async handleDomainEvent(event: DomainEvent) {
        await this.auditLogRepository.save({
            organizationId: event.getOrganizationId(),
            action: event.getAction(),
            entityType: event.getEntityType(),
            entityId: event.getEntityId(),
            metadata: event.getMetadata(),
        });
    }
}
