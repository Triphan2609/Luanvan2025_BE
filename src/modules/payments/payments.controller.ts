import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { Response } from 'express';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Bank Account endpoints
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

  @Patch('bank-accounts/:id')
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

  @Get('methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiResponse({ status: 200, description: 'Return all payment methods' })
  findAllMethods() {
    return this.paymentsService.findAllMethods();
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get payments by booking ID' })
  @ApiResponse({ status: 200, description: 'Return payments for a booking' })
  findByBookingId(@Param('bookingId') bookingId: string) {
    return this.paymentsService.findByBookingId(bookingId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Post('deposit/:bookingId')
  @ApiOperation({ summary: 'Create a deposit payment' })
  @ApiResponse({
    status: 201,
    description: 'Deposit payment created successfully',
  })
  createDeposit(
    @Param('bookingId') bookingId: string,
    @Body() createDepositDto: CreateDepositDto,
  ) {
    return this.paymentsService.createDeposit(bookingId, createDepositDto);
  }

  @Post(':paymentId/refund')
  @ApiOperation({ summary: 'Process a refund' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  processRefund(
    @Param('paymentId') paymentId: string,
    @Body() processRefundDto: ProcessRefundDto,
  ) {
    return this.paymentsService.processRefund(paymentId, processRefundDto);
  }

  @Patch(':paymentId/confirm')
  @ApiOperation({ summary: 'Confirm a payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  confirmPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.confirmPayment(paymentId);
  }

  @Post('invoice/:bookingId')
  @ApiOperation({ summary: 'Generate and send invoice' })
  @ApiResponse({
    status: 200,
    description: 'Invoice generated and sent successfully',
  })
  generateAndSendInvoice(@Param('bookingId') bookingId: string) {
    return this.paymentsService.generateAndSendInvoice(bookingId);
  }

  @Post('invoice/:bookingId/send-email')
  @ApiOperation({ summary: 'Send invoice to customer email' })
  @ApiResponse({
    status: 200,
    description: 'Invoice sent to email successfully',
  })
  sendInvoiceEmail(
    @Param('bookingId') bookingId: string,
    @Body() body: { email: string },
  ) {
    return this.paymentsService.sendInvoiceEmail(bookingId, body.email);
  }

  @Get('invoice/:bookingId')
  @ApiOperation({ summary: 'Get invoice for a booking' })
  @ApiResponse({ status: 200, description: 'Return invoice for booking' })
  getInvoice(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getInvoice(bookingId);
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

  @Get('invoices')
  @ApiOperation({ summary: 'Get all invoices with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Return all invoices with pagination',
  })
  getAllInvoices(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
    @Query('searchText') searchText?: string,
  ) {
    return this.paymentsService.getAllInvoices({
      page,
      limit,
      status,
      startDate,
      endDate,
      branchId,
      searchText,
    });
  }
}
