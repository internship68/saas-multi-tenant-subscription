import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '../../../user/domain/role.enum';

export class InviteMemberDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsEnum(Role)
    @IsNotEmpty()
    role!: Role;
}

export class JoinOrganizationDto {
    @IsString()
    @IsNotEmpty()
    token!: string;
}
