import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentType,
  PaymentTarget,
} from './entities/payment.entity';
import {
  PaymentMethod,
  PaymentMethodType,
} from './entities/payment-method.entity';
import { BankAccount } from './entities/bank-account.entity';
import { Invoice } from './entities/invoice.entity';
import { BookingsService } from '../bookings/bookings.service';
import { EmailService } from '../email/email.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { ConfigService } from '@nestjs/config';
import { InvoiceTarget } from './entities/invoice.entity';

// Define a booking interface to use instead of 'any'
interface BookingData {
  id: string;
  checkIn?: Date;
  checkInDate?: Date;
  checkOut?: Date;
  checkOutDate?: Date;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  room?: {
    roomCode?: string;
    roomType?: {
      name?: string;
    };
    price?: number;
  };
  services?: Array<{
    price: number;
    name?: string;
    quantity?: number;
  }>;
  discount?: number;
  branch?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    id?: number;
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookingsService: BookingsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  // Bank Account methods
  async findAllBankAccounts() {
    return this.bankAccountRepository.find({
      order: { bankName: 'ASC' },
    });
  }

  async findActiveBankAccounts() {
    return this.bankAccountRepository.find({
      where: { isActive: true },
      order: { bankName: 'ASC' },
    });
  }

  async findBankAccountById(id: string) {
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { id },
    });

    if (!bankAccount) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return bankAccount;
  }

  async createBankAccount(createBankAccountDto: CreateBankAccountDto) {
    const bankAccount = this.bankAccountRepository.create(createBankAccountDto);
    return this.bankAccountRepository.save(bankAccount);
  }

  async updateBankAccount(
    id: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    const bankAccount = await this.findBankAccountById(id);

    const updatedBankAccount = {
      ...bankAccount,
      ...updateBankAccountDto,
    };

    return this.bankAccountRepository.save(updatedBankAccount);
  }

  async removeBankAccount(id: string) {
    const bankAccount = await this.findBankAccountById(id);
    return this.bankAccountRepository.remove(bankAccount);
  }

  // Existing methods
  async findAllMethods() {
    // Always return the three default payment methods if none exist
    const count = await this.paymentMethodRepository.count();

    if (count === 0) {
      // Create default payment methods
      const defaultMethods = [
        {
          id: 1,
          name: 'Tiền mặt',
          type: PaymentMethodType.CASH,
          description: 'Thanh toán bằng tiền mặt',
          isActive: true,
          isOnline: false,
        },
        {
          id: 2,
          name: 'Chuyển khoản',
          type: PaymentMethodType.BANK_TRANSFER,
          description: 'Thanh toán bằng chuyển khoản ngân hàng',
          isActive: true,
          isOnline: false,
        },
        {
          id: 3,
          name: 'Thanh toán VNPay',
          type: PaymentMethodType.VNPAY,
          description: 'Thanh toán qua cổng VNPay',
          isActive: true,
          isOnline: true,
        },
      ];

      const savedMethods =
        await this.paymentMethodRepository.save(defaultMethods);
      return savedMethods;
    }

    return this.paymentMethodRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findAll() {
    return this.paymentRepository.find({
      relations: ['booking', 'method'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByBookingId(bookingId: string) {
    return this.paymentRepository.find({
      where: { bookingId },
      relations: ['method'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(createPaymentDto: CreatePaymentDto) {
    // Nếu là thanh toán cho nhà hàng
    if (
      createPaymentDto.target === PaymentTarget.RESTAURANT &&
      createPaymentDto.restaurantOrderId
    ) {
      // TODO: Kiểm tra order nhà hàng khi module restaurant được phát triển
      // const restaurantOrder = await this.restaurantOrderService.findOne(createPaymentDto.restaurantOrderId);
      // if (!restaurantOrder) {
      //   throw new NotFoundException(
      //     `Không tìm thấy order nhà hàng với ID ${createPaymentDto.restaurantOrderId}`,
      //   );
      // }
    }
    // Nếu là thanh toán cho khách sạn
    else if (
      createPaymentDto.target === PaymentTarget.HOTEL &&
      createPaymentDto.bookingId
    ) {
      // Kiểm tra booking có tồn tại không
      const booking = await this.bookingsService.findOne(
        createPaymentDto.bookingId,
      );
      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với ID ${createPaymentDto.bookingId}`,
        );
      }

      // Nếu không có branchId nhưng booking có branch, lấy từ booking
      if (!createPaymentDto.branchId && booking.branch?.id) {
        createPaymentDto.branchId = booking.branch.id;
      }
    } else {
      throw new BadRequestException(
        `Phải cung cấp bookingId hoặc restaurantOrderId tương ứng với target`,
      );
    }

    // Kiểm tra phương thức thanh toán có tồn tại không
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: createPaymentDto.methodId, isActive: true },
    });
    if (!paymentMethod) {
      throw new NotFoundException(
        `Không tìm thấy phương thức thanh toán với ID ${createPaymentDto.methodId}`,
      );
    }

    // Tạo bản ghi thanh toán mới
    const payment = this.paymentRepository.create(createPaymentDto);
    return this.paymentRepository.save(payment);
  }

  async createDeposit(bookingId: string, createDepositDto: CreateDepositDto) {
    // Kiểm tra booking có tồn tại không
    const booking = await this.bookingsService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy booking với ID ${bookingId}`);
    }

    // Kiểm tra phương thức thanh toán có tồn tại không
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: createDepositDto.methodId, isActive: true },
    });
    if (!paymentMethod) {
      throw new NotFoundException(
        `Không tìm thấy phương thức thanh toán với ID ${createDepositDto.methodId}`,
      );
    }

    // Tạo payment mới với loại là DEPOSIT
    const payment = this.paymentRepository.create({
      ...createDepositDto,
      bookingId,
      type: PaymentType.DEPOSIT,
      status: paymentMethod.isOnline
        ? PaymentStatus.PENDING
        : PaymentStatus.CONFIRMED,
    });

    // Lưu payment
    const savedPayment = await this.paymentRepository.save(payment);

    // Nếu thanh toán đã được xác nhận, tự động cập nhật hóa đơn
    if (savedPayment.status === PaymentStatus.CONFIRMED) {
      await this.updateInvoiceAfterPayment(booking.id);
    }

    return savedPayment;
  }

  async processRefund(paymentId: string, processRefundDto: ProcessRefundDto) {
    // Tìm payment gốc
    const originalPayment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'method'],
    });
    if (!originalPayment) {
      throw new NotFoundException(
        `Không tìm thấy thanh toán với ID ${paymentId}`,
      );
    }

    // Kiểm tra số tiền hoàn lại không vượt quá số tiền gốc
    if (processRefundDto.amount > originalPayment.amount) {
      throw new BadRequestException(
        `Số tiền hoàn lại không thể lớn hơn số tiền ban đầu`,
      );
    }

    // Tạo payment mới với loại là REFUND
    const refundPayment = this.paymentRepository.create({
      amount: processRefundDto.amount,
      bookingId: originalPayment.booking.id,
      methodId: originalPayment.method.id,
      type: PaymentType.REFUND,
      status: PaymentStatus.CONFIRMED,
      notes: `Hoàn tiền: ${processRefundDto.reason}. ${processRefundDto.notes || ''}`,
      transactionId: processRefundDto.transactionId,
    });

    // Lưu payment
    const savedRefund = await this.paymentRepository.save(refundPayment);

    // Cập nhật trạng thái của payment gốc
    originalPayment.status = PaymentStatus.REFUNDED;
    await this.paymentRepository.save(originalPayment);

    // Cập nhật hóa đơn
    await this.updateInvoiceAfterRefund(originalPayment.booking.id);

    return savedRefund;
  }

  async confirmPayment(paymentId: string) {
    // Tìm payment
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException(
        `Không tìm thấy thanh toán với ID ${paymentId}`,
      );
    }

    // Chỉ có thể xác nhận các payment đang ở trạng thái PENDING
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Thanh toán này không ở trạng thái chờ xác nhận`,
      );
    }

    // Cập nhật trạng thái payment
    payment.status = PaymentStatus.CONFIRMED;
    const updatedPayment = await this.paymentRepository.save(payment);

    // Cập nhật hóa đơn
    await this.updateInvoiceAfterPayment(payment.bookingId);

    return updatedPayment;
  }

  /**
   * Tạo hóa đơn và gửi cho khách hàng
   */
  async generateAndSendInvoice(bookingId: string) {
    // Find the booking
    const booking = await this.bookingsService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy booking với ID ${bookingId}`);
    }

    // Validate if booking has customer with email
    if (!booking.customer || !booking.customer.email) {
      throw new BadRequestException(
        'Booking không có thông tin khách hàng hoặc email',
      );
    }

    // Create invoice if not exists
    let invoice = await this.getInvoice(bookingId);
    if (!invoice) {
      invoice = await this.createInvoice(booking as BookingData);
    }

    // Chuẩn bị dữ liệu cho template email
    const checkIn = new Date(booking.checkInDate || new Date());
    const checkOut = new Date(booking.checkOutDate || new Date());

    // Define branch data with proper typing
    const branchData = {
      name:
        booking.branch?.name ||
        this.configService.get<string>('HOTEL_NAME', 'Khách sạn ABC'),
      address:
        booking.branch?.address ||
        this.configService.get<string>(
          'HOTEL_ADDRESS',
          '123 Đường XYZ, TP.HCM',
        ),
      phone:
        booking.branch?.phone ||
        this.configService.get<string>('HOTEL_PHONE', '1900 1234'),
      email:
        booking.branch?.email ||
        this.configService.get<string>('HOTEL_EMAIL', 'info@abchotel.com'),
      website:
        booking.branch?.website ||
        this.configService.get<string>('HOTEL_WEBSITE', 'www.abchotel.com'),
    };

    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      customer: {
        name: booking.customer?.name || 'Quý khách',
        email: booking.customer?.email,
        phone: booking.customer?.phone || 'N/A',
      },
      checkIn: checkIn.toLocaleDateString('vi-VN'),
      checkOut: checkOut.toLocaleDateString('vi-VN'),
      roomNumber: booking.room?.roomCode || 'N/A',
      roomType: booking.room?.roomType?.name || 'N/A',
      totalAmount: invoice.finalAmount,
      branch: branchData,
      currentYear: new Date().getFullYear(),
    };

    // Send email with invoice data
    if (booking.customer?.email) {
      await this.emailService.sendInvoiceEmail(
        booking.customer.email,
        'Hóa đơn thanh toán - ' + invoiceData.invoiceNumber,
        invoiceData,
      );
    }

    return {
      success: true,
      message: 'Hóa đơn đã được tạo và gửi thành công',
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  /**
   * Gửi hóa đơn tới một địa chỉ email cụ thể
   */
  async sendInvoiceEmail(bookingId: string, email: string) {
    try {
      // Validate email
      if (!email) {
        throw new BadRequestException('Email là bắt buộc');
      }

      // Tìm booking
      const booking = await this.bookingsService.findOne(bookingId);
      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với ID ${bookingId}`,
        );
      }

      // Tìm hoặc tạo hóa đơn
      let invoice = await this.getInvoice(bookingId);
      if (!invoice) {
        invoice = await this.createInvoice(booking as any);
      }

      // Chuẩn bị dữ liệu cho template email
      const checkIn = new Date(booking.checkInDate || new Date());
      const checkOut = new Date(booking.checkOutDate || new Date());

      // Define branch data with proper typing
      const branchData = {
        name:
          booking.branch?.name ||
          this.configService.get<string>('HOTEL_NAME', 'Khách sạn ABC'),
        address:
          booking.branch?.address ||
          this.configService.get<string>(
            'HOTEL_ADDRESS',
            '123 Đường XYZ, TP.HCM',
          ),
        phone:
          booking.branch?.phone ||
          this.configService.get<string>('HOTEL_PHONE', '1900 1234'),
        email:
          booking.branch?.email ||
          this.configService.get<string>('HOTEL_EMAIL', 'info@abchotel.com'),
        website:
          booking.branch?.website ||
          this.configService.get<string>('HOTEL_WEBSITE', 'www.abchotel.com'),
      };

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        customer: {
          name: booking.customer?.name || 'Quý khách',
          email: booking.customer?.email || email,
          phone: booking.customer?.phone || 'N/A',
        },
        checkIn: checkIn.toLocaleDateString('vi-VN'),
        checkOut: checkOut.toLocaleDateString('vi-VN'),
        roomNumber: booking.room?.roomCode || 'N/A',
        roomType: booking.room?.roomType?.name || 'N/A',
        totalAmount: invoice.finalAmount,
        branch: branchData,
        currentYear: new Date().getFullYear(),
      };

      // Gửi email với template không có tệp đính kèm
      await this.emailService.sendInvoiceEmail(
        email,
        'Hóa đơn thanh toán - ' + invoiceData.invoiceNumber,
        invoiceData,
      );

      return {
        success: true,
        message: `Hóa đơn đã được gửi thành công đến ${email}`,
      };
    } catch (error) {
      // Xử lý lỗi khi gửi email
      if (error instanceof Error && 'code' in error && error.code === 'EAUTH') {
        throw new BadRequestException(
          'Không thể gửi email do lỗi xác thực email. Vui lòng kiểm tra cấu hình email.',
        );
      }
      throw error;
    }
  }

  async getInvoice(bookingId: string) {
    return this.invoiceRepository.findOne({
      where: { bookingId },
      relations: ['booking', 'booking.customer', 'booking.room'],
    });
  }

  async getAllInvoices(options: {
    page: number;
    limit: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    searchText?: string;
    target?: string;
  }) {
    const {
      page,
      limit,
      status,
      startDate,
      endDate,
      branchId,
      searchText,
      target,
    } = options;

    // Build the query
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.branch', 'branch')
      .leftJoinAndSelect('invoice.branch', 'invoiceBranch');

    // Lọc theo loại hóa đơn (khách sạn hoặc nhà hàng)
    if (target) {
      queryBuilder.andWhere('invoice.target = :target', { target });
    }

    // Apply filters if provided
    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('invoice.issueDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('invoice.issueDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    // Apply branch filter if provided
    if (branchId) {
      queryBuilder.andWhere('invoice.branchId = :branchId', { branchId });
    }

    // Apply text search if provided
    if (searchText) {
      queryBuilder.andWhere(
        '(customer.name LIKE :searchText OR invoice.invoiceNumber LIKE :searchText OR room.roomCode LIKE :searchText)',
        { searchText: `%${searchText}%` },
      );
    }

    // Add sorting
    queryBuilder.orderBy('invoice.issueDate', 'DESC');

    // Add pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query and count total
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private async createInvoice(booking: BookingData) {
    // Tính tổng tiền
    const totalAmount = this.calculateTotalAmount(booking);

    // Tính giảm giá (nếu có)
    const discountAmount = booking.discount
      ? (totalAmount * booking.discount) / 100
      : 0;

    // Tính số tiền cuối cùng (không có thuế)
    const finalAmount = totalAmount - discountAmount;

    // Tạo mã hóa đơn
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1,
    ).padStart(2, '0')}${String(new Date().getDate()).padStart(
      2,
      '0',
    )}-${booking.id.substring(0, 8)}`;

    // Lấy branchId nếu có
    const branchId = booking.branch?.id || undefined;

    // Tạo hóa đơn mới
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      bookingId: booking.id,
      totalAmount,
      discountAmount,
      finalAmount,
      issueDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Hạn thanh toán 7 ngày
      target: InvoiceTarget.HOTEL,
      branchId,
    });

    return this.invoiceRepository.save(invoice);
  }

  private async updateInvoiceAfterPayment(bookingId: string) {
    // Tìm hóa đơn
    let invoice = await this.getInvoice(bookingId);
    if (!invoice) {
      // Nếu chưa có hóa đơn, tạo mới
      const booking = await this.bookingsService.findOne(bookingId);
      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với ID ${bookingId}`,
        );
      }
      invoice = await this.createInvoice(booking as BookingData);
    }

    return this.invoiceRepository.save(invoice);
  }

  private async updateInvoiceAfterRefund(bookingId: string) {
    // Tìm hóa đơn
    const invoice = await this.getInvoice(bookingId);
    if (!invoice) {
      return null;
    }

    return this.invoiceRepository.save(invoice);
  }

  private calculateTotalAmount(booking: BookingData) {
    // Tính số đêm lưu trú
    const checkIn = new Date(
      booking.checkIn || booking.checkInDate || new Date(),
    );
    const checkOut = new Date(
      booking.checkOut || booking.checkOutDate || new Date(),
    );
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Giá phòng cơ bản
    let totalAmount = (booking.room?.price || 0) * nights;

    // Cộng thêm các dịch vụ phát sinh (nếu có)
    if (booking.services && Array.isArray(booking.services)) {
      booking.services.forEach((service) => {
        totalAmount += service.price || 0;
      });
    }

    return totalAmount;
  }

  // Tạo hóa đơn cho đơn hàng nhà hàng
  private async createInvoiceForRestaurant(
    restaurantOrderId: string,
    branchId?: number,
  ) {
    // TODO: Hoàn thiện phương thức này khi có service để lấy thông tin đơn hàng nhà hàng
    // Ví dụ mẫu:
    const invoiceNumber = `INV-RES-${Date.now()}`;

    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      restaurantOrderId,
      totalAmount: 0, // Cần tính toán dựa trên đơn hàng nhà hàng
      discountAmount: 0,
      finalAmount: 0,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày sau
      target: InvoiceTarget.RESTAURANT,
      branchId: branchId || undefined,
    });

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Các phương thức liên quan đến xử lý PDF đã được xóa bỏ để tối ưu hóa hệ thống
   * và giảm tải cho server. Thông tin hóa đơn sẽ được hiển thị trực tiếp trong email
   * hoặc trang web thay vì gửi file đính kèm.
   */
}
