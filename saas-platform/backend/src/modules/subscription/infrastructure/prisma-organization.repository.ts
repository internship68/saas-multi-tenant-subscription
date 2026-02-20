import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OrganizationRepository } from '../domain/organization.repository.interface';
import { Organization } from '../domain/organization.entity';

interface PrismaOrganization {
  id: string;
  name: string;
  createdAt: Date;
}

interface OrganizationDelegate {
  upsert(args: {
    where: { id: string };
    create: PrismaOrganization;
    update: PrismaOrganization;
  }): Promise<PrismaOrganization>;

  findUnique(args: {
    where: { id: string };
  }): Promise<PrismaOrganization | null>;
}

type PrismaServiceWithOrganization = PrismaService & {
  organization: OrganizationDelegate;
};

function mapPrismaToDomain(model: PrismaOrganization): Organization {
  return Organization.restore({
    id: model.id,
    name: model.name,
    createdAt: model.createdAt,
  });
}

function mapDomainToPrisma(entity: Organization): PrismaOrganization {
  const json = entity.toJSON();
  return {
    id: json.id,
    name: json.name,
    createdAt: json.createdAt,
  } as PrismaOrganization;
}

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaServiceWithOrganization) {}

  async save(organization: Organization): Promise<void> {
    const data = mapDomainToPrisma(organization);

    await this.prisma.organization.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: string): Promise<Organization | null> {
    const model = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!model) {
      return null;
    }

    return mapPrismaToDomain(model);
  }
}
