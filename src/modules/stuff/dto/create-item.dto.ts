import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  IsBoolean,
} from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class CreateItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inUseQuantity?: number;

  @IsNotEmpty()
  @IsEnum(ItemType)
  itemType: ItemType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentUses?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
