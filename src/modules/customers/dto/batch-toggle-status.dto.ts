import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { CustomerStatus } from '../entities/customer.entity';

export class BatchToggleStatusDto {
  @ApiProperty({
    description: 'Array of customer IDs to update',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'New status to set',
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
  })
  @IsEnum(CustomerStatus)
  status: CustomerStatus;
}
