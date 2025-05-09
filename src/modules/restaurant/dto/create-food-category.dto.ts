import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateFoodCategoryDto {
  @ApiProperty({ description: 'Name of the food category' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the food category',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Status of the food category (active or inactive)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isActive?: boolean;

  @ApiProperty({
    description: 'Thumbnail URL for the food category',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Branch ID', required: true })
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  branchId: number;
}
