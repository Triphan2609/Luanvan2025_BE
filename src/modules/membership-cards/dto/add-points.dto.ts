import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPointsDto {
  @ApiProperty({
    description: 'Số điểm cộng thêm',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  points: number;

  @ApiProperty({
    description: 'Số tiền giao dịch (VND)',
    example: 1000000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({
    description: 'Mô tả giao dịch',
    example: 'Thanh toán hóa đơn',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
