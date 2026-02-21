import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Payment, PaymentStatus } from '../domain/payment.entity';
import { PaymentRepository } from '../domain/payment.repository.interface';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(payment: Payment): Promise<void> {
        const data = payment.toJSON();

        await this.prisma.payment.upsert({
            where: { id: data.id },
            create: {
                id: data.id,
                organizationId: data.organizationId,
                subscriptionId: data.subscriptionId,
                amount: data.amount,
                currency: data.currency,
                status: data.status,
                providerPaymentId: data.providerPaymentId,
                createdAt: data.createdAt,
            },
            update: {
                status: data.status,
            },
        });
    }

    async findByOrganizationId(organizationId: string): Promise<Payment[]> {
        const models = await this.prisma.payment.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });

        return models.map((model: typeof models[number]) => Payment.restore({
            id: model.id,
            organizationId: model.organizationId,
            subscriptionId: model.subscriptionId,
            amount: model.amount,
            currency: model.currency,
            status: model.status as PaymentStatus,
            createdAt: model.createdAt,
            providerPaymentId: model.providerPaymentId,
        }));
    }
}
