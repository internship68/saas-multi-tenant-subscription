import { Module } from '@nestjs/common';
import { PaymentController } from './presentation/payment/payment.controller';
import { PrismaPaymentRepository } from './infrastructure/prisma-payment.repository';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [
    {
      provide: 'PaymentRepository',
      useClass: PrismaPaymentRepository,
    },
  ],
  exports: ['PaymentRepository'],
})
export class PaymentModule { }
