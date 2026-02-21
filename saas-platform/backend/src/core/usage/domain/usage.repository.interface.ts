import { OrganizationUsage } from './organization-usage.entity';

export interface UsageRepository {
    save(usage: OrganizationUsage): Promise<void>;
    findByOrganizationIdAndType(organizationId: string, type: string): Promise<OrganizationUsage | null>;
    findAllToReset(): Promise<OrganizationUsage[]>;
}
