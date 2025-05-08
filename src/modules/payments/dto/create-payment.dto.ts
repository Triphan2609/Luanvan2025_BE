import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Booking ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({ description: 'Payment amount', example: 1000000 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Payment method ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  methodId: number;

  @ApiProperty({
    description: 'Payment type',
    example: 'full',
    enum: PaymentType,
  })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiProperty({
    description: 'Transaction ID from payment provider',
    example: 'TRANS123456',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Additional notes for payment',
    example: 'Payment for booking #123',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
