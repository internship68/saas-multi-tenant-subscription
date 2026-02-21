import { Controller, Post, Get, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { InviteUserUseCase } from '../../application/invite-user.usecase';
import { JoinOrganizationUseCase } from '../../application/join-organization.usecase';
import { ListMembersUseCase } from '../../application/list-members.usecase';
import { InviteMemberDto, JoinOrganizationDto } from '../dto/organization.dto';
import { ActiveSubscriptionGuard } from '../../../auth/guards/active-subscription.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
    constructor(
        private readonly inviteUserUseCase: InviteUserUseCase,
        private readonly joinOrganizationUseCase: JoinOrganizationUseCase,
        private readonly listMembersUseCase: ListMembersUseCase,
    ) { }

    @Post('invite')
    async invite(@Body() dto: InviteMemberDto, @Request() req: any) {
        const organizationId = req.user.organizationId;
        if (!organizationId) {
            throw new ForbiddenException('You must belong to an organization to invite members');
        }

        return this.inviteUserUseCase.execute({
            organizationId,
            email: dto.email,
            role: dto.role,
            inviterId: req.user.sub,
        });
    }

    @Post('join')
    async join(@Body() dto: JoinOrganizationDto, @Request() req: any) {
        return this.joinOrganizationUseCase.execute({
            token: dto.token,
            userId: req.user.sub,
        });
    }

    @Get('members')
    @UseGuards(ActiveSubscriptionGuard)
    async listMembers(@Request() req: any) {
        const organizationId = req.user.organizationId;
        if (!organizationId) {
            throw new ForbiddenException('Organization not found');
        }

        const members = await this.listMembersUseCase.execute({
            organizationId,
            requestorId: req.user.sub,
        });

        return members.map(m => m.toJSON());
    }
}
