import { IsEnum, IsNotEmpty } from 'class-validator';
import { MembershipCardStatus } from '../entities/membership-card.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCardStatusDto {
  @ApiProperty({
    description: 'Trạng thái thẻ mới (active/expired/blocked)',
    enum: MembershipCardStatus,
    example: MembershipCardStatus.ACTIVE,
  })
  @IsEnum(MembershipCardStatus)
  @IsNotEmpty()
  status: MembershipCardStatus;
}
