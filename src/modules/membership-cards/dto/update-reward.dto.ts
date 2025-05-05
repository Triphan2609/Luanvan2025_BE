import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RewardStatus } from '../entities/reward.entity';

export class UpdateRewardDto {
  @ApiProperty({
    description: 'Tên phần thưởng',
    example: 'Voucher giảm giá 50,000đ',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Số điểm cần để đổi phần thưởng',
    example: 500,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  points?: number;

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
    required: false,
  })
  @IsEnum(RewardStatus)
  @IsOptional()
  status?: RewardStatus;

  // Thêm trường image để sử dụng trong RewardsService
  @IsOptional()
  image?: string;

  // Không cần validate image vì sẽ được xử lý bởi multer middleware
}
