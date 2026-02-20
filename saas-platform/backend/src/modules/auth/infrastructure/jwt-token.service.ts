import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload, TokenService } from '../domain/token.service.interface';

@Injectable()
export class JwtTokenService implements TokenService {
    constructor(private readonly jwtService: JwtService) { }

    generateToken(payload: TokenPayload): string {
        return this.jwtService.sign(payload);
    }

    verifyToken(token: string): TokenPayload {
        return this.jwtService.verify<TokenPayload>(token);
    }
}
