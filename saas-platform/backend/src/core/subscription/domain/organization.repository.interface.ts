import { Organization } from './organization.entity';

export interface OrganizationRepository {
  save(organization: Organization): Promise<void>;
  findById(id: string): Promise<Organization | null>;
}
