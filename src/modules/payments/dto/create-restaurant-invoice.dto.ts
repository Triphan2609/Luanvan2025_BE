import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RestaurantInvoiceStatus } from '../entities/restaurant-invoice.entity';

export class CreateRestaurantInvoiceDto {
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

  @IsEnum(RestaurantInvoiceStatus)
  @IsOptional()
  status?: RestaurantInvoiceStatus;

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

  @IsString()
  restaurantOrderId: string;

  @IsNumber()
  @IsOptional()
  branchId?: number;
}
