import { Payment } from './payment.entity';

export interface PaymentRepository {
    save(payment: Payment): Promise<void>;
    findByOrganizationId(organizationId: string): Promise<Payment[]>;
}
