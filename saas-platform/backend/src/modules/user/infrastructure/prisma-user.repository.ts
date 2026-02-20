import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UserRepository } from '../domain/user.repository.interface';
import { User } from '../domain/user.entity';
import { Role } from '../domain/role.enum';

@Injectable()
export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(user: User): Promise<void> {
        const data = user.toJSON();
        const prismaData = {
            id: data.id,
            email: data.email,
            password: user.getPasswordHash(),
            name: data.name,
            role: data.role,
            organizationId: data.organizationId,
            createdAt: data.createdAt,
        };

        await this.prisma.user.upsert({
            where: { id: prismaData.id },
            create: prismaData,
            update: prismaData,
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        const model = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!model) return null;

        return User.restore({
            id: model.id,
            email: model.email,
            passwordHash: model.password,
            name: model.name,
            role: model.role as Role,
            organizationId: model.organizationId,
            createdAt: model.createdAt,
        });
    }

    async findById(id: string): Promise<User | null> {
        const model = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!model) return null;

        return User.restore({
            id: model.id,
            email: model.email,
            passwordHash: model.password,
            name: model.name,
            role: model.role as Role,
            organizationId: model.organizationId,
            createdAt: model.createdAt,
        });
    }
}
