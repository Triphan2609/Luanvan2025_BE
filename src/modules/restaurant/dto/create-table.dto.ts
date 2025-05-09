import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TableStatus } from '../entities/table.entity';

export class CreateTableDto {
  @ApiProperty({ description: 'Table number or identifier' })
  @IsString()
  tableNumber: string;

  @ApiProperty({ description: 'Number of people the table can accommodate' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  capacity: number;

  @ApiProperty({
    description: 'Status of the table',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

  @ApiProperty({
    description: 'ID của khu vực (Area ID)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  areaId?: number;

  @ApiProperty({
    description: 'Whether this is a VIP table',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isVIP?: boolean;

  @ApiProperty({ description: 'X position on floor plan', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  positionX?: number;

  @ApiProperty({ description: 'Y position on floor plan', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  positionY?: number;

  @ApiProperty({ description: 'Whether the table is active', default: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isActive?: boolean;

  @ApiProperty({ description: 'Branch ID' })
  @IsNumber()
  @Type(() => Number)
  branchId: number;
}
