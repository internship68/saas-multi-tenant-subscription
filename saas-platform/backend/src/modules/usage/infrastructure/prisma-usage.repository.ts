import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OrganizationUsage } from '../domain/organization-usage.entity';
import { UsageRepository } from '../domain/usage.repository.interface';

@Injectable()
export class PrismaUsageRepository implements UsageRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(usage: OrganizationUsage): Promise<void> {
        await this.prisma.organizationUsage.upsert({
            where: {
                organizationId_type: {
                    organizationId: usage.getOrganizationId(),
                    type: usage.getType(),
                },
            },
            update: {
                currentValue: usage.getCurrentValue(),
                limit: usage.getLimit(),
                resetAt: usage.getResetAt(),
            },
            create: {
                organizationId: usage.getOrganizationId(),
                type: usage.getType(),
                currentValue: usage.getCurrentValue(),
                limit: usage.getLimit(),
                resetAt: usage.getResetAt(),
            },
        });
    }

    async findByOrganizationIdAndType(organizationId: string, type: string): Promise<OrganizationUsage | null> {
        const raw = await this.prisma.organizationUsage.findUnique({
            where: {
                organizationId_type: {
                    organizationId,
                    type,
                },
            },
        });

        if (!raw) return null;

        return OrganizationUsage.restore({
            id: raw.id,
            organizationId: raw.organizationId,
            type: raw.type,
            currentValue: raw.currentValue,
            limit: raw.limit,
            resetAt: raw.resetAt,
        });
    }

    async findAllToReset(): Promise<OrganizationUsage[]> {
        const now = new Date();
        const raws = await this.prisma.organizationUsage.findMany({
            where: {
                resetAt: {
                    lte: now,
                },
            },
        });

        return raws.map((raw: any) =>
            OrganizationUsage.restore({
                id: raw.id,
                organizationId: raw.organizationId,
                type: raw.type,
                currentValue: raw.currentValue,
                limit: raw.limit,
                resetAt: raw.resetAt,
            }),
        );
    }
}
