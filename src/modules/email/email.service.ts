import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as fs from 'fs';

// Define interfaces for type safety
interface InvoiceData {
  customer?: { name?: string };
  invoiceNumber?: string;
  checkIn?: string;
  checkOut?: string;
  roomNumber?: string;
  roomType?: string;
  totalAmount?: number;
  branch?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}

interface BookingData {
  id?: string;
  customer?: { name?: string; phone?: string; email?: string };
  checkIn?: Date;
  checkOut?: Date;
  room?: { roomCode?: string; roomType?: { name?: string } };
  totalAmount?: number;
  branch?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Gửi email đơn giản
   */
  async sendEmail(to: string, subject: string, text: string): Promise<any> {
    return this.mailerService.sendMail({
      to,
      subject,
      text,
    });
  }

  /**
   * Gửi email HTML
   */
  async sendHtmlEmail(to: string, subject: string, html: string): Promise<any> {
    return this.mailerService.sendMail({
      to,
      subject,
      html,
    });
  }

  /**
   * Gửi email có đính kèm file
   */
  async sendEmailWithAttachment(
    to: string,
    subject: string,
    text: string,
    attachmentPath: string,
  ): Promise<any> {
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(attachmentPath)) {
      throw new Error(`File không tồn tại: ${attachmentPath}`);
    }

    return this.mailerService.sendMail({
      to,
      subject,
      text,
      attachments: [
        {
          path: attachmentPath,
        },
      ],
    });
  }

  /**
   * Gửi hóa đơn qua email sử dụng template
   */
  async sendInvoiceEmail(
    to: string,
    subject: string,
    invoiceData: InvoiceData,
  ): Promise<any> {
    try {
      this.logger.log(`Sending invoice email to ${to}`);

      return this.mailerService.sendMail({
        to,
        subject: subject || 'Hóa đơn thanh toán',
        template: 'invoice', // Tên template, tương ứng với tên file trong thư mục templates
        context: {
          // Dữ liệu truyền vào template
          customer: invoiceData.customer?.name || 'Quý khách',
          invoiceNumber: invoiceData.invoiceNumber || 'N/A',
          checkIn: invoiceData.checkIn || 'N/A',
          checkOut: invoiceData.checkOut || 'N/A',
          roomNumber: invoiceData.roomNumber || 'N/A',
          roomType: invoiceData.roomType || 'N/A',
          totalAmount: invoiceData.totalAmount?.toLocaleString('vi-VN') || '0',
          paymentDate: new Date().toLocaleDateString('vi-VN'),
          hotelName: invoiceData.branch?.name || 'Khách sạn ABC',
          hotelAddress: invoiceData.branch?.address || '123 Đường XYZ, TP.HCM',
          hotelPhone: invoiceData.branch?.phone || '1900 1234',
          hotelEmail: invoiceData.branch?.email || 'info@abchotel.com',
          hotelWebsite: invoiceData.branch?.website || 'www.abchotel.com',
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error sending invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }

  /**
   * Gửi email xác nhận đặt phòng
   */
  async sendBookingConfirmationEmail(
    to: string,
    bookingData: BookingData,
  ): Promise<any> {
    try {
      this.logger.log(`Sending booking confirmation email to ${to}`);

      return this.mailerService.sendMail({
        to,
        subject: 'Xác nhận đặt phòng thành công',
        template: 'booking-confirmation',
        context: {
          customer: bookingData.customer?.name || 'Quý khách',
          bookingId: bookingData.id,
          roomNumber: bookingData.room?.roomCode || 'N/A',
          roomType: bookingData.room?.roomType?.name || 'N/A',
          checkIn: new Date(
            bookingData.checkIn || new Date(),
          ).toLocaleDateString('vi-VN'),
          checkOut: new Date(
            bookingData.checkOut || new Date(),
          ).toLocaleDateString('vi-VN'),
          totalAmount: bookingData.totalAmount?.toLocaleString('vi-VN') || '0',
          hotelName: bookingData.branch?.name || 'Khách sạn ABC',
          hotelAddress: bookingData.branch?.address || '123 Đường XYZ, TP.HCM',
          hotelPhone: bookingData.branch?.phone || '1900 1234',
          hotelEmail: bookingData.branch?.email || 'info@abchotel.com',
          hotelWebsite: bookingData.branch?.website || 'www.abchotel.com',
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error sending booking confirmation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }

  async sendRestaurantInvoiceEmail(
    to: string,
    subject: string,
    invoiceData: any,
  ): Promise<any> {
    try {
      this.logger.log(`Sending restaurant invoice email to ${to}`);
      return this.mailerService.sendMail({
        to,
        subject: subject || 'Hóa đơn thanh toán nhà hàng',
        template: 'restaurant-invoice',
        context: {
          branchName: invoiceData.branch?.name || 'Nhà hàng',
          branchAddress: invoiceData.branch?.address || '',
          branchPhone: invoiceData.branch?.phone || '',
          invoiceNumber: invoiceData.invoiceNumber,
          paymentDate: invoiceData.paymentDate,
          tableNumber: invoiceData.tableNumber,
          areaName: invoiceData.areaName,
          staffName: invoiceData.staffName,
          items: invoiceData.items || [],
          totalAmount: invoiceData.totalAmount?.toLocaleString('vi-VN') || '0',
          notes: invoiceData.notes || '',
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error sending restaurant invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
