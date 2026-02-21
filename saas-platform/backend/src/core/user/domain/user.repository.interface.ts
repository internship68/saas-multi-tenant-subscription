import { User } from './user.entity';

export interface UserRepository {
    save(user: User): Promise<void>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByOrganizationId(organizationId: string): Promise<User[]>;
}
