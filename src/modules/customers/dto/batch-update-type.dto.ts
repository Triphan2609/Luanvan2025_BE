import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { CustomerType } from '../entities/customer.entity';

export class BatchUpdateTypeDto {
  @ApiProperty({
    description: 'Array of customer IDs to update',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'New customer type to set',
    enum: CustomerType,
    example: CustomerType.VIP,
  })
  @IsEnum(CustomerType)
  type: CustomerType;
}
