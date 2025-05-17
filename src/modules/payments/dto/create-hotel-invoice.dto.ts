import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HotelInvoiceStatus } from '../entities/hotel-invoice.entity';

export class CreateHotelInvoiceDto {
  @IsString()
  invoiceNumber: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @Min(0)
  finalAmount: number;

  @IsEnum(HotelInvoiceStatus)
  @IsOptional()
  status?: HotelInvoiceStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @Type(() => Date)
  issueDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @IsUUID()
  bookingId: string;

  @IsNumber()
  @IsOptional()
  branchId?: number;
}
