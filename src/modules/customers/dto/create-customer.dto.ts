import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerType, Gender } from '../entities/customer.entity';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Full name of the customer',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Phone number of the customer',
    example: '0901234567',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Email of the customer',
    example: 'example@email.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'ID card number or passport of the customer',
    example: '079201234567',
  })
  @IsString()
  idNumber: string;

  @ApiProperty({
    description: 'Type of customer',
    enum: CustomerType,
    example: CustomerType.NORMAL,
  })
  @IsEnum(CustomerType)
  type: CustomerType;

  @ApiProperty({
    description: 'Customer address',
    example: '123 ABC Street, XYZ District',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Additional notes about the customer',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    description: 'Gender of the customer',
    enum: Gender,
    example: Gender.MALE,
    required: false,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({
    description: 'Customer birthday',
    example: '1990-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  birthday?: string;

  @ApiProperty({
    description: 'Branch ID where the customer is registered',
    example: 1,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  branchId: number;
}
