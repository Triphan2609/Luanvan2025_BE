import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({
    description: 'Số điểm sẽ đổi',
    example: 500,
  })
  @IsNumber()
  @IsNotEmpty()
  points: number;

  @ApiProperty({
    description: 'ID của phần thưởng',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  rewardId: number;

  @ApiProperty({
    description: 'Mô tả giao dịch đổi điểm',
    example: 'Đổi điểm lấy voucher giảm giá',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
