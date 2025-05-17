import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  BadRequestException,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { Response } from 'express';
import { CreateHotelInvoiceDto } from './dto/create-hotel-invoice.dto';
import { CreateRestaurantInvoiceDto } from './dto/create-restaurant-invoice.dto';
import { PaymentStatus } from './entities/payment.entity';
import { HotelInvoiceStatus } from './entities/hotel-invoice.entity';
import { RestaurantInvoiceStatus } from './entities/restaurant-invoice.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Payment endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiResponse({ status: 200, description: 'Return all payment methods' })
  async findAllMethods() {
    console.log('---[LOG] GET /payments/methods called ---');
    const result = await this.paymentsService.findAllMethods();
    console.log('Kết quả trả về methods:', result);
    return result;
  }

  @Get('hotel-invoices')
  @ApiOperation({ summary: 'Get all hotel invoices' })
  @ApiResponse({ status: 200, description: 'Return all hotel invoices' })
  async findHotelInvoices(@Query('bookingId') bookingId?: string) {
    console.log('---[LOG] GET /payments/hotel-invoices called ---');
    console.log('BookingId nhận được:', bookingId);
    if (bookingId) {
      const result =
        await this.paymentsService.findHotelInvoiceByBookingId(bookingId);
      console.log('Kết quả trả về hotel-invoices:', result);
      return result;
    }
    const all = await this.paymentsService.findAllHotelInvoices();
    console.log('Kết quả trả về tất cả hotel-invoices:', all);
    return all;
  }

  @Post('hotel-invoices')
  @ApiOperation({ summary: 'Create a new hotel invoice' })
  @ApiResponse({
    status: 201,
    description: 'Hotel invoice created successfully',
  })
  createHotelInvoice(@Body() createHotelInvoiceDto: CreateHotelInvoiceDto) {
    return this.paymentsService.createHotelInvoice(createHotelInvoiceDto);
  }

  @Get('hotel-invoices/:id')
  @ApiOperation({ summary: 'Get hotel invoice by ID' })
  @ApiResponse({ status: 200, description: 'Return hotel invoice details' })
  findHotelInvoiceById(@Param('id') id: string) {
    return this.paymentsService.findHotelInvoiceById(id);
  }

  @Patch('hotel-invoices/:id/status')
  @ApiOperation({ summary: 'Update hotel invoice status' })
  @ApiResponse({
    status: 200,
    description: 'Hotel invoice status updated successfully',
  })
  updateHotelInvoiceStatus(
    @Param('id') id: string,
    @Body('status') status: HotelInvoiceStatus,
  ) {
    return this.paymentsService.updateHotelInvoiceStatus(id, status);
  }

  @Post('hotel-invoices/:id/send-email')
  @ApiOperation({ summary: 'Send hotel invoice to customer email' })
  @ApiResponse({
    status: 200,
    description: 'Hotel invoice sent to email successfully',
  })
  async sendHotelInvoiceEmail(
    @Param('id') hotelInvoiceId: string,
    @Body('email') email: string,
  ) {
    await this.paymentsService.sendHotelInvoiceEmail(hotelInvoiceId, email);
    return { message: 'Email sent successfully' };
  }

  @Patch('hotel-invoices/:id/confirm')
  @ApiOperation({ summary: 'Confirm hotel invoice payment' })
  @ApiResponse({ status: 200, description: 'Hotel invoice payment confirmed' })
  confirmHotelInvoicePayment(@Param('id') hotelInvoiceId: string) {
    return this.paymentsService.confirmHotelInvoicePayment(hotelInvoiceId);
  }

  @Get('restaurant-invoices')
  @ApiOperation({ summary: 'Get all restaurant invoices' })
  @ApiResponse({ status: 200, description: 'Return all restaurant invoices' })
  findAllRestaurantInvoices() {
    return this.paymentsService.findAllRestaurantInvoices();
  }

  @Post('restaurant-invoices')
  @ApiOperation({ summary: 'Create a new restaurant invoice' })
  @ApiResponse({
    status: 201,
    description: 'Restaurant invoice created successfully',
  })
  createRestaurantInvoice(
    @Body() createRestaurantInvoiceDto: CreateRestaurantInvoiceDto,
  ) {
    return this.paymentsService.createRestaurantInvoice(
      createRestaurantInvoiceDto,
    );
  }

  @Get('restaurant-invoices/:id')
  @ApiOperation({ summary: 'Get restaurant invoice by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return restaurant invoice details',
  })
  findRestaurantInvoiceById(@Param('id') id: string) {
    return this.paymentsService.findRestaurantInvoiceById(id);
  }

  @Patch('restaurant-invoices/:id/status')
  @ApiOperation({ summary: 'Update restaurant invoice status' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant invoice status updated successfully',
  })
  updateRestaurantInvoiceStatus(
    @Param('id') id: string,
    @Body('status') status: RestaurantInvoiceStatus,
  ) {
    return this.paymentsService.updateRestaurantInvoiceStatus(id, status);
  }

  @Get('bank-accounts')
  @ApiOperation({ summary: 'Get all bank accounts' })
  @ApiResponse({ status: 200, description: 'Return all bank accounts' })
  findAllBankAccounts() {
    return this.paymentsService.findAllBankAccounts();
  }

  @Get('bank-accounts/active')
  @ApiOperation({ summary: 'Get all active bank accounts' })
  @ApiResponse({ status: 200, description: 'Return all active bank accounts' })
  findActiveBankAccounts() {
    return this.paymentsService.findActiveBankAccounts();
  }

  @Get('bank-accounts/:id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiResponse({ status: 200, description: 'Return bank account details' })
  findBankAccountById(@Param('id') id: string) {
    return this.paymentsService.findBankAccountById(id);
  }

  @Post('bank-accounts')
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({
    status: 201,
    description: 'Bank account created successfully',
  })
  createBankAccount(@Body() createBankAccountDto: CreateBankAccountDto) {
    return this.paymentsService.createBankAccount(createBankAccountDto);
  }

  @Put('bank-accounts/:id')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
  })
  updateBankAccount(
    @Param('id') id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.paymentsService.updateBankAccount(id, updateBankAccountDto);
  }

  @Delete('bank-accounts/:id')
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account deleted successfully',
  })
  removeBankAccount(@Param('id') id: string) {
    return this.paymentsService.removeBankAccount(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments' })
  findAllPayments() {
    return this.paymentsService.findAllPayments();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Return payment details' })
  findPaymentById(@Param('id') id: string) {
    return this.paymentsService.findPaymentById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({
    status: 200,
    description: 'Payment status updated successfully',
  })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body('status') status: PaymentStatus,
  ) {
    return this.paymentsService.updatePaymentStatus(id, status);
  }

  @Get('invoice/:bookingId/download')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiResponse({
    status: 200,
    description: 'Feature deprecated - PDF downloads have been removed',
  })
  async downloadInvoice(
    @Param('bookingId') bookingId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log(
        `PDF download feature is deprecated for booking: ${bookingId}`,
      );

      // Set appropriate headers for the response
      res.set({
        'Content-Type': 'application/json',
      });

      // Thêm một thao tác await để tránh lỗi lint
      await Promise.resolve();

      // Thông báo rằng tính năng tải xuống PDF đã bị loại bỏ
      throw new BadRequestException(
        'Tính năng tải xuống PDF đã bị loại bỏ để tối ưu hóa hệ thống. Vui lòng sử dụng email hoặc xem hóa đơn trực tiếp trên hệ thống.',
      );
    } catch (error) {
      // Log the error and rethrow
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }
}
