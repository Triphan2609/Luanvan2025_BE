import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerType, CustomerStatus } from '../entities/customer.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterCustomerDto extends PaginationDto {
  @ApiProperty({
    description: 'Search term for customer name, phone, or ID number',
    required: false,
    example: 'Nguyễn',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by customer type',
    enum: CustomerType,
    required: false,
    example: CustomerType.VIP,
  })
  @IsEnum(CustomerType, { message: 'Type must be either normal or vip' })
  @IsOptional()
  type?: CustomerType;

  @ApiProperty({
    description: 'Filter by customer status',
    enum: CustomerStatus,
    required: false,
    example: CustomerStatus.ACTIVE,
  })
  @IsEnum(CustomerStatus, {
    message: 'Status must be either active or blocked',
  })
  @IsOptional()
  status?: CustomerStatus;

  @ApiProperty({
    description: 'Branch ID to filter customers',
    required: false,
    example: 1,
  })
  @IsOptional()
  branchId?: number;
}
