import { Module } from '@nestjs/common';
import { OrganizationController } from './presentation/organization/organization.controller';
import { PrismaOrganizationRepository } from './infrastructure/prisma-organization.repository';
import { PrismaInvitationRepository } from './infrastructure/prisma-invitation.repository';
import { InviteUserUseCase } from './application/invite-user.usecase';
import { JoinOrganizationUseCase } from './application/join-organization.usecase';
import { ListMembersUseCase } from './application/list-members.usecase';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [UserModule, PrismaModule],
  controllers: [OrganizationController],
  providers: [
    {
      provide: 'OrganizationRepository',
      useClass: PrismaOrganizationRepository,
    },
    {
      provide: 'InvitationRepository',
      useClass: PrismaInvitationRepository,
    },
    InviteUserUseCase,
    JoinOrganizationUseCase,
    ListMembersUseCase,
  ],
  exports: ['OrganizationRepository'],
})
export class OrganizationModule { }
