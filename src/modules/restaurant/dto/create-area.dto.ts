import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateRestaurantAreaDto {
  @ApiProperty({ description: 'Name of the area', example: 'Khu vực VIP' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the area',
    required: false,
    example: 'Khu vực dành cho khách VIP với dịch vụ cao cấp',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the area is active',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isActive?: boolean;

  @ApiProperty({
    description: 'Branch ID',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  branchId: number;
}
