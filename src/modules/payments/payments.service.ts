import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BookingsService } from '../bookings/bookings.service';
import { EmailService } from '../email/email.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { ConfigService } from '@nestjs/config';
import {
  HotelInvoice,
  HotelInvoiceStatus,
} from './entities/hotel-invoice.entity';
import {
  RestaurantInvoice,
  RestaurantInvoiceStatus,
} from './entities/restaurant-invoice.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateHotelInvoiceDto } from './dto/create-hotel-invoice.dto';
import { CreateRestaurantInvoiceDto } from './dto/create-restaurant-invoice.dto';
import { RestaurantOrder } from '../restaurant/order/order.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(HotelInvoice)
    private readonly hotelInvoiceRepository: Repository<HotelInvoice>,
    @InjectRepository(RestaurantInvoice)
    private readonly restaurantInvoiceRepository: Repository<RestaurantInvoice>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(RestaurantOrder)
    private readonly restaurantOrderRepository: Repository<RestaurantOrder>,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookingsService: BookingsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  // Payment methods
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { hotelInvoiceId, restaurantInvoiceId, methodId, ...paymentData } =
      createPaymentDto;

    if (!hotelInvoiceId && !restaurantInvoiceId) {
      throw new BadRequestException(
        'Either hotelInvoiceId or restaurantInvoiceId must be provided',
      );
    }

    if (hotelInvoiceId && restaurantInvoiceId) {
      throw new BadRequestException(
        'Cannot provide both hotelInvoiceId and restaurantInvoiceId',
      );
    }

    const method = await this.paymentMethodRepository.findOne({
      where: { id: methodId },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    const payment = this.paymentRepository.create({
      ...paymentData,
      method,
      hotelInvoice: hotelInvoiceId ? { id: hotelInvoiceId } : undefined,
      restaurantInvoice: restaurantInvoiceId
        ? { id: restaurantInvoiceId }
        : undefined,
    });

    return this.paymentRepository.save(payment);
  }

  async findAllPayments(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['method', 'hotelInvoice', 'restaurantInvoice'],
    });
  }

  async findPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['method', 'hotelInvoice', 'restaurantInvoice'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<Payment> {
    const payment = await this.findPaymentById(id);
    payment.status = status;
    return this.paymentRepository.save(payment);
  }

  // Hotel Invoice methods
  async createHotelInvoice(
    createHotelInvoiceDto: CreateHotelInvoiceDto,
  ): Promise<HotelInvoice> {
    const {
      bookingId,
      branchId,
      invoiceNumber,
      totalAmount,
      finalAmount,
      issueDate,
      status,
      notes,
      dueDate,
    } = createHotelInvoiceDto;
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['branch'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const invoice = this.hotelInvoiceRepository.create({
      booking,
      bookingId,
      branchId,
      invoiceNumber,
      totalAmount,
      finalAmount,
      issueDate,
      status: status || HotelInvoiceStatus.PENDING,
      notes,
      dueDate,
    });

    return this.hotelInvoiceRepository.save(invoice);
  }

  async findAllHotelInvoices(): Promise<HotelInvoice[]> {
    return this.hotelInvoiceRepository.find({
      relations: ['booking', 'branch', 'payments'],
    });
  }

  async findHotelInvoiceById(id: string): Promise<HotelInvoice> {
    const invoice = await this.hotelInvoiceRepository.findOne({
      where: { id },
      relations: ['booking', 'branch', 'payments'],
    });

    if (!invoice) {
      throw new NotFoundException('Hotel invoice not found');
    }

    return invoice;
  }

  async updateHotelInvoiceStatus(
    id: string,
    status: HotelInvoiceStatus,
  ): Promise<HotelInvoice> {
    const invoice = await this.findHotelInvoiceById(id);
    invoice.status = status;
    return this.hotelInvoiceRepository.save(invoice);
  }

  async findHotelInvoiceByBookingId(
    bookingId: string,
  ): Promise<HotelInvoice[]> {
    console.log('---[LOG] findHotelInvoiceByBookingId ---');
    console.log('BookingId nhận được:', bookingId, typeof bookingId);
    const result = await this.hotelInvoiceRepository.find({
      where: { bookingId },
      relations: ['booking', 'branch', 'payments'],
    });
    console.log('Kết quả truy vấn hotelInvoice:', result);
    return result;
  }

  // Restaurant Invoice methods
  async createRestaurantInvoice(
    createRestaurantInvoiceDto: CreateRestaurantInvoiceDto,
  ): Promise<RestaurantInvoice> {
    const { restaurantOrderId, branchId, ...invoiceData } =
      createRestaurantInvoiceDto;

    const branch = branchId
      ? await this.branchRepository.findOne({ where: { id: branchId } })
      : null;
    if (branchId && !branch) {
      throw new NotFoundException('Branch not found');
    }

    const invoice = this.restaurantInvoiceRepository.create({
      ...invoiceData,
      restaurantOrderId,
      branchId: branch?.id,
      status: RestaurantInvoiceStatus.PENDING,
    });

    return this.restaurantInvoiceRepository.save(invoice);
  }

  async findAllRestaurantInvoices(): Promise<RestaurantInvoice[]> {
    return this.restaurantInvoiceRepository.find({
      relations: ['branch', 'payments'],
    });
  }

  async findRestaurantInvoiceById(id: string): Promise<RestaurantInvoice> {
    const invoice = await this.restaurantInvoiceRepository.findOne({
      where: { id },
      relations: ['branch', 'payments'],
    });

    if (!invoice) {
      throw new NotFoundException('Restaurant invoice not found');
    }

    return invoice;
  }

  async updateRestaurantInvoiceStatus(
    id: string,
    status: RestaurantInvoiceStatus,
  ): Promise<RestaurantInvoice> {
    const invoice = await this.findRestaurantInvoiceById(id);
    invoice.status = status;
    return this.restaurantInvoiceRepository.save(invoice);
  }

  // Bank Account methods
  async findAllBankAccounts(): Promise<BankAccount[]> {
    return this.bankAccountRepository.find();
  }

  async findActiveBankAccounts(): Promise<BankAccount[]> {
    return this.bankAccountRepository.find({ where: { isActive: true } });
  }

  async findBankAccountById(id: string): Promise<BankAccount> {
    const account = await this.bankAccountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Bank account not found');
    }
    return account;
  }

  async createBankAccount(
    createBankAccountDto: CreateBankAccountDto,
  ): Promise<BankAccount> {
    const account = this.bankAccountRepository.create(createBankAccountDto);
    return this.bankAccountRepository.save(account);
  }

  async updateBankAccount(
    id: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ): Promise<BankAccount> {
    const account = await this.findBankAccountById(id);
    Object.assign(account, updateBankAccountDto);
    return this.bankAccountRepository.save(account);
  }

  async removeBankAccount(id: string): Promise<void> {
    const account = await this.findBankAccountById(id);
    await this.bankAccountRepository.remove(account);
  }

  // Payment Method methods
  async findAllMethods(): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.find();
  }

  // Helper methods
  private calculateHotelInvoiceTotal(booking: Booking): number {
    return booking.totalAmount;
  }

  // Gửi hóa đơn khách sạn qua email
  async sendHotelInvoiceEmail(
    hotelInvoiceId: string,
    email: string,
  ): Promise<void> {
    const invoice = await this.findHotelInvoiceById(hotelInvoiceId);
    if (!invoice) throw new NotFoundException('Hotel invoice not found');
    if (!invoice.booking || !invoice.booking.customer)
      throw new NotFoundException('Booking or customer not found');
    const booking = invoice.booking;
    const customer = booking.customer;
    const branch = invoice.branch;
    const customerName =
      customer && (customer['fullName'] || customer['name'])
        ? customer['fullName'] || customer['name']
        : 'Quý khách';
    const invoiceData = {
      customer: { name: customerName },
      invoiceNumber: invoice.invoiceNumber,
      checkIn: booking.checkInDate
        ? new Date(booking.checkInDate).toLocaleDateString('vi-VN')
        : '',
      checkOut: booking.checkOutDate
        ? new Date(booking.checkOutDate).toLocaleDateString('vi-VN')
        : '',
      roomNumber: booking.room?.roomCode
        ? String(booking.room.roomCode)
        : String(booking.roomId),
      roomType: booking.room?.roomType?.name || '',
      totalAmount: invoice.totalAmount,
      branch: {
        name: branch?.name,
        address: branch?.address,
        phone: branch?.phone,
        email: branch?.email,
        website: branch?.website,
      },
    };
    await this.emailService.sendInvoiceEmail(
      email,
      'Hóa đơn thanh toán khách sạn',
      invoiceData,
    );
  }

  // Xác nhận thanh toán hóa đơn khách sạn
  async confirmHotelInvoicePayment(
    hotelInvoiceId: string,
  ): Promise<HotelInvoice> {
    const invoice = await this.findHotelInvoiceById(hotelInvoiceId);
    if (!invoice) throw new NotFoundException('Hotel invoice not found');
    invoice.status = HotelInvoiceStatus.PAID;
    return this.hotelInvoiceRepository.save(invoice);
  }

  async sendRestaurantInvoiceEmail(
    restaurantInvoiceId: string,
    email: string,
  ): Promise<void> {
    const invoice = await this.findRestaurantInvoiceById(restaurantInvoiceId);
    if (!invoice) throw new NotFoundException('Restaurant invoice not found');
    // Lấy order, table, area, items
    let order: RestaurantOrder | null = null;
    if (invoice.restaurantOrderId) {
      order = await this.restaurantOrderRepository.findOne({
        where: { id: invoice.restaurantOrderId },
        relations: ['table', 'items', 'table.area'],
      });
    }
    const table = order && 'table' in order ? order.table : undefined;
    const areaName =
      table && 'area' in table && table.area ? table.area.name : '';
    const items =
      order && 'items' in order && Array.isArray(order.items)
        ? order.items.map((item, idx) => ({
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price).toLocaleString('vi-VN'),
            total: (Number(item.price) * Number(item.quantity)).toLocaleString(
              'vi-VN',
            ),
          }))
        : [];
    await this.emailService.sendRestaurantInvoiceEmail(
      email,
      'Hóa đơn thanh toán nhà hàng',
      {
        branch: invoice.branch,
        invoiceNumber: invoice.invoiceNumber,
        paymentDate: new Date().toLocaleDateString('vi-VN'),
        tableNumber: table && 'tableNumber' in table ? table.tableNumber : '',
        areaName,
        staffName:
          order && 'staffName' in order ? (order as any).staffName || '' : '',
        items,
        totalAmount: invoice.totalAmount,
        notes: invoice.notes,
      },
    );
  }
}
