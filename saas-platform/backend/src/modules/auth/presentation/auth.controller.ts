import { Body, Controller, Post } from '@nestjs/common';
import { RegisterUseCase } from '../application/register.usecase';
import { LoginUseCase } from '../application/login.usecase';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterResult } from '../application/register.types';
import { LoginResult } from '../application/login.types';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly registerUseCase: RegisterUseCase,
        private readonly loginUseCase: LoginUseCase,
    ) { }

    @Post('register')
    async register(@Body() dto: RegisterDto): Promise<RegisterResult> {
        return this.registerUseCase.execute({
            email: dto.email,
            passwordRaw: dto.password,
            name: dto.name,
            organizationName: dto.organizationName,
        });
    }

    @Post('login')
    async login(@Body() dto: LoginDto): Promise<LoginResult> {
        return this.loginUseCase.execute({
            email: dto.email,
            passwordRaw: dto.password,
        });
    }
}
