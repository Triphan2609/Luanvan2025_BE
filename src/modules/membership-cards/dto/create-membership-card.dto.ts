import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import {
  MembershipCardType,
  MembershipCardStatus,
} from '../entities/membership-card.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMembershipCardDto {
  @ApiProperty({
    description: 'Loại thẻ thành viên (silver/gold/platinum)',
    enum: MembershipCardType,
    default: MembershipCardType.SILVER,
    required: false,
  })
  @IsEnum(MembershipCardType)
  @IsOptional()
  type?: MembershipCardType;

  @ApiProperty({
    description: 'ID của khách hàng',
    example: '4613fe0b-ef89-40e9-9481-1d5f8d96799a',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Ngày cấp thẻ (YYYY-MM-DD)',
    example: '2023-01-01',
  })
  @IsDateString()
  issueDate: string;

  @ApiProperty({
    description: 'Ngày hết hạn thẻ (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString()
  expireDate: string;

  @ApiProperty({
    description: 'Số điểm khởi tạo',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiProperty({
    description: 'Tổng chi tiêu khởi tạo',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  totalSpent?: number;

  @ApiProperty({
    description: 'Trạng thái thẻ',
    enum: MembershipCardStatus,
    default: MembershipCardStatus.ACTIVE,
    required: false,
  })
  @IsEnum(MembershipCardStatus)
  @IsOptional()
  status?: MembershipCardStatus;
}
