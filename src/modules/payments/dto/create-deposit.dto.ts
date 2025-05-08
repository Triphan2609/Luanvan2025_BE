import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({ description: 'Deposit amount', example: 500000 })
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
    description: 'Transaction ID from payment provider',
    example: 'TRANS123456',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Additional notes for deposit',
    example: 'Deposit for booking #123',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
