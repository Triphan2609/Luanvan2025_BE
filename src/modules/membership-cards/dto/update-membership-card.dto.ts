import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import {
  MembershipCardType,
  MembershipCardStatus,
} from '../entities/membership-card.entity';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateMembershipCardDto } from './create-membership-card.dto';

export class UpdateMembershipCardDto extends PartialType(
  CreateMembershipCardDto,
) {
  @ApiProperty({
    description: 'Loại thẻ thành viên (silver/gold/platinum)',
    enum: MembershipCardType,
    required: false,
  })
  @IsEnum(MembershipCardType)
  @IsOptional()
  type?: MembershipCardType;

  @ApiProperty({
    description: 'Ngày hết hạn thẻ (YYYY-MM-DD)',
    example: '2025-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expireDate?: string;

  @ApiProperty({
    description: 'Trạng thái thẻ',
    enum: MembershipCardStatus,
    required: false,
  })
  @IsEnum(MembershipCardStatus)
  @IsOptional()
  status?: MembershipCardStatus;
}
