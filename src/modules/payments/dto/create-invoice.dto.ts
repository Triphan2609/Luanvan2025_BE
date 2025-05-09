import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { InvoiceTarget } from '../entities/invoice.entity';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsString()
  invoiceNumber: string;

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsNotEmpty()
  @IsNumber()
  finalAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  issueDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsString()
  restaurantOrderId?: string;

  @IsOptional()
  @IsEnum(InvoiceTarget)
  target?: InvoiceTarget;

  @ApiProperty({
    description: 'Branch ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  branchId?: number;
}
