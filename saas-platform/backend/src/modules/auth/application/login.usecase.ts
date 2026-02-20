import {
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { LoginCommand, LoginResult } from './login.types';
import { PasswordHasher } from '../domain/password-hasher.interface';
import { TokenService } from '../domain/token.service.interface';
import { UserRepository } from '../../user/domain/user.repository.interface';

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
        @Inject('TokenService')
        private readonly tokenService: TokenService,
    ) { }

    async execute(command: LoginCommand): Promise<LoginResult> {
        const user = await this.userRepository.findByEmail(command.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await this.passwordHasher.compare(
            command.passwordRaw,
            user.getPasswordHash(),
        );

        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.tokenService.generateToken({
            sub: user.getId(),
            email: user.getEmail(),
            role: user.getRole(),
            organizationId: user.getOrganizationId(),
        });

        return {
            token,
            user: user.toJSON(),
        };
    }
}
