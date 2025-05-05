import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RewardStatus } from '../entities/reward.entity';

export class CreateRewardDto {
  @ApiProperty({
    description: 'Tên phần thưởng',
    example: 'Voucher giảm giá 50,000đ',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Số điểm cần để đổi phần thưởng',
    example: 500,
  })
  @IsNumber()
  @IsNotEmpty()
  points: number;

  @ApiProperty({
    description: 'Mô tả chi tiết về phần thưởng',
    example: 'Voucher giảm giá 50,000đ cho bất kỳ dịch vụ nào',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Trạng thái phần thưởng (active/inactive)',
    enum: RewardStatus,
    default: RewardStatus.ACTIVE,
    required: false,
  })
  @IsEnum(RewardStatus)
  @IsOptional()
  status?: RewardStatus;

  // Không cần validate image vì sẽ được xử lý bởi multer middleware
}
