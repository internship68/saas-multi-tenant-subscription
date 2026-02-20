export interface AuditLogContent {
    organizationId: string;
    action: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    metadata?: Record<string, any>;
}

export interface AuditLogRepository {
    save(log: AuditLogContent): Promise<void>;
}
