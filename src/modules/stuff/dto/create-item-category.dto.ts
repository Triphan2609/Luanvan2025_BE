import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateItemCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;
}
