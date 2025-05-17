import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { MenuType, MenuSeason } from '../menu.entity';

export class CreateMenuDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  branchId: number;

  @IsArray()
  @IsUUID('all', { each: true })
  foodIds: string[];

  @IsEnum(MenuType)
  type: MenuType;

  @IsEnum(MenuSeason)
  @IsOptional()
  season?: MenuSeason;

  @IsNumber()
  @IsOptional()
  price?: number;
}
