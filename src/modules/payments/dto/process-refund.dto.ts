import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class ProcessRefundDto {
  @ApiProperty({ description: 'Refund amount', example: 500000 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Reason for refund',
    example: 'Customer cancellation',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Transaction ID from payment provider',
    example: 'REFUND123456',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Additional notes for refund',
    example: 'Refund processed by staff',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
