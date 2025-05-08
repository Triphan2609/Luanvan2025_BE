import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Invoice } from './entities/invoice.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, Invoice, BankAccount]),
    forwardRef(() => BookingsModule),
    EmailModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
