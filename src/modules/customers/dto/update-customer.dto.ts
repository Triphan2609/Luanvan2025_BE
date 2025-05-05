import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { CustomerStatus } from '../entities/customer.entity';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiProperty({
    description: 'Customer status',
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
    required: false,
  })
  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;
}
