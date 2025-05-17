import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDate,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MenuType, MenuStatus } from '../menu/menu.entity';
import { Type } from 'class-transformer';

export class CreateMenuDto {
  @ApiProperty({ description: 'Name of the menu' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the menu', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Menu status (active or inactive)',
    enum: MenuStatus,
    default: MenuStatus.ACTIVE,
  })
  @IsEnum(MenuStatus)
  @IsOptional()
  status?: MenuStatus;

  @ApiProperty({
    description: 'Type of menu (REGULAR, SEASONAL, SPECIAL)',
    enum: MenuType,
    default: MenuType.REGULAR,
  })
  @IsEnum(MenuType)
  @IsOptional()
  type?: MenuType;

  @ApiProperty({
    description: 'Start date for seasonal/special menus',
    required: false,
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'End date for seasonal/special menus',
    required: false,
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ description: 'Branch ID', required: true })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    description: 'Array of food IDs to include in the menu',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  foodIds?: string[];
}
