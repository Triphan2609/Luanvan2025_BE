import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RewardStatus } from '../entities/reward.entity';

export class UpdateRewardStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của phần thưởng',
    enum: RewardStatus,
    example: RewardStatus.ACTIVE,
  })
  @IsEnum(RewardStatus)
  @IsNotEmpty()
  status: RewardStatus;
}
