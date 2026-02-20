import { Role } from '../../user/domain/role.enum';

export interface TokenPayload {
    sub: string;
    email: string;
    role: Role;
    organizationId: string;
}

export interface TokenService {
    generateToken(payload: TokenPayload): string;
    verifyToken(token: string): TokenPayload;
}
