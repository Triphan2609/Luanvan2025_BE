import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

export class ImportCustomersDto {
  @ApiProperty({
    description: 'Array of customers to import',
    type: [CreateCustomerDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one customer is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerDto)
  customers: CreateCustomerDto[];
}
