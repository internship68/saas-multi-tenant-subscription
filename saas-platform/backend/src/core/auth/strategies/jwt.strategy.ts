import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../domain/token.service.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'fallback_secret',
        });
    }

    async validate(payload: TokenPayload) {
        if (!payload.sub || !payload.organizationId) {
            throw new UnauthorizedException('Invalid token payload');
        }

        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            organizationId: payload.organizationId,
        };
    }
}
