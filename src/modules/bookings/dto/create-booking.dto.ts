import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsDateString,
  Min,
  IsPositive,
  ValidateIf,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  BookingStatus,
  PaymentStatus,
  BookingSource,
} from '../entities/booking.entity';

export class TempCustomerDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '001202123456' })
  @IsString()
  @IsNotEmpty()
  idCard: string;
}

export class CreateBookingDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsUUID()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isWalkInCustomer || !o.customerTemp)
  customerId: string;

  @ApiProperty({
    example: {
      name: 'Nguyễn Văn A',
      phone: '0901234567',
      idCard: '001202123456',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateIf((o) => o.isWalkInCustomer && !o.customerId)
  customerTemp?: TempCustomerDto;

  @ApiProperty({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isWalkInCustomer?: boolean;

  @ApiProperty({
    example: true,
    default: true,
    description: 'Có lưu thông tin khách vãng lai vào hệ thống không',
  })
  @IsOptional()
  @IsBoolean()
  saveCustomer?: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty({ example: '2025-04-25T12:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({ example: '2025-04-27T12:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsNumber()
  @Min(1)
  @IsPositive()
  adults: number;

  @ApiProperty({ example: 1, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  children?: number;

  @ApiProperty({ example: 1400000 })
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @ApiProperty({ enum: BookingStatus, default: BookingStatus.PENDING })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiProperty({ enum: PaymentStatus, default: PaymentStatus.UNPAID })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiProperty({ enum: BookingSource, default: BookingSource.WALK_IN })
  @IsEnum(BookingSource)
  @IsOptional()
  source?: BookingSource;

  @ApiProperty({ example: 'Yêu cầu tầng cao', required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  branchId: number;

  @ApiProperty({ example: 'employee-id', required: false })
  @IsString()
  @IsOptional()
  createdBy?: string;
}
