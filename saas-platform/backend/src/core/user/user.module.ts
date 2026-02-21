import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
// import { CreateUserUseCase } from './application/create-user.usecase';

@Module({
  providers: [
    {
      provide: 'UserRepository',
      useClass: PrismaUserRepository,
    },
    // CreateUserUseCase,
  ],
  exports: ['UserRepository'],
})
export class UserModule { }
