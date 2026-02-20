import { BadRequestException, Inject, Injectable, ConflictException } from '@nestjs/common';
import { RegisterCommand, RegisterResult } from './register.types';
import { PasswordHasher } from '../domain/password-hasher.interface';
import { TokenService } from '../domain/token.service.interface';
import { UserRepository } from '../../user/domain/user.repository.interface';
import { User } from '../../user/domain/user.entity';
import { Role } from '../../user/domain/role.enum';
import { CreateOrganizationUseCase } from '../../subscription/application/create-organization.usecase';

/**
 * RegisterUseCase — orchestrates user registration.
 *
 * Responsibilities:
 *  1. Check if email exists
 *  2. Create Organization + free subscription (via CreateOrganizationUseCase)
 *  3. Hash password
 *  4. Create User as OWNER
 *  5. Generate JWT
 */
@Injectable()
export class RegisterUseCase {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
        @Inject('TokenService')
        private readonly tokenService: TokenService,
        private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    ) { }

    async execute(command: RegisterCommand): Promise<RegisterResult> {
        const existingUser = await this.userRepository.findByEmail(command.email);
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        // Hash the password securely in Infrastructure
        const passwordHash = await this.passwordHasher.hash(command.passwordRaw);

        // Create organization (and implicitly a free subscription)
        const { organization } = await this.createOrganizationUseCase.execute({
            name: command.organizationName,
        });

        // Create user entity (Domain business rule inside User.create)
        const user = User.create(
            command.email,
            passwordHash,
            command.name,
            Role.OWNER,
            organization.getId(),
        );

        await this.userRepository.save(user);

        // Generate JWT token
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
