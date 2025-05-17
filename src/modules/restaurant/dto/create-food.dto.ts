import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsPositive,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { FoodStatus } from '../entities/food.entity';

export class CreateFoodDto {
  @ApiProperty({ description: 'Name of the food item' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the food item', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Price of the food item' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Status of the food item',
    enum: FoodStatus,
    default: FoodStatus.AVAILABLE,
  })
  @IsEnum(FoodStatus)
  @IsOptional()
  status?: FoodStatus;

  @ApiProperty({ description: 'URL of the food image', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'List of ingredients', required: false })
  @IsString()
  @IsOptional()
  ingredients?: string;

  @ApiProperty({
    description: 'Whether the food is vegetarian',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isVegetarian?: boolean;

  @ApiProperty({ description: 'Whether the food is vegan', default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isVegan?: boolean;

  @ApiProperty({
    description: 'Whether the food is gluten-free',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isGlutenFree?: boolean;

  @ApiProperty({ description: 'Spicy level (1-5)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  spicyLevel?: number;

  @ApiProperty({ description: 'Preparation time in minutes', required: false })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  preparationTime?: number;

  @ApiProperty({ description: 'Category ID' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiProperty({
    description: 'Menu IDs to associate with this food',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  menuIds?: string[];

  @ApiProperty({
    description:
      'Danh sách nguyên liệu cho món ăn (mỗi phần tử gồm ingredientId và amount)',
    required: false,
    type: [Object],
    example: [
      { ingredientId: 'uuid-nguyen-lieu-1', amount: 2 },
      { ingredientId: 'uuid-nguyen-lieu-2', amount: 1 },
    ],
  })
  @IsArray()
  @IsOptional()
  ingredientsList?: { ingredientId: string; amount: number }[];
}
