import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { RegisterUseCase } from './application/register.usecase';
import { LoginUseCase } from './application/login.usecase';
import { AuthController } from './presentation/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    UserModule,
    SubscriptionModule, // สำหรับดึง CreateOrganizationUseCase ใช้ใน Register
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: 'PasswordHasher',
      useClass: BcryptPasswordHasher,
    },
    {
      provide: 'TokenService',
      useClass: JwtTokenService,
    },
    RegisterUseCase,
    LoginUseCase,
    JwtStrategy,
  ],
  exports: ['TokenService', JwtStrategy, PassportModule],
})
export class AuthModule { }
