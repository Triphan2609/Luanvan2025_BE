import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { BankAccount } from './entities/bank-account.entity';
import { HotelInvoice } from './entities/hotel-invoice.entity';
import { RestaurantInvoice } from './entities/restaurant-invoice.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { EmailModule } from '../email/email.module';
import { RestaurantOrder } from '../restaurant/order/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentMethod,
      BankAccount,
      HotelInvoice,
      RestaurantInvoice,
      Branch,
      Booking,
      RestaurantOrder,
    ]),
    forwardRef(() => BookingsModule),
    EmailModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
