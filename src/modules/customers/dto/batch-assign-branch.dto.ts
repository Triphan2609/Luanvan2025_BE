import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsUUID } from 'class-validator';

export class BatchAssignBranchDto {
  @ApiProperty({
    description: 'Array of customer IDs to update',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'Branch ID to assign',
    example: 1,
    required: true,
  })
  @IsNumber()
  branchId: number;
}
