import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ShiftType } from '../entities/shift.entity';

export class CreateShiftDto {
  @IsOptional()
  @IsString()
  shift_code?: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(ShiftType)
  type: ShiftType;

  @IsNotEmpty()
  @IsString()
  start_time: string;

  @IsNotEmpty()
  @IsString()
  end_time: string;

  @IsOptional()
  @IsString()
  break_time?: string;

  @IsNumber()
  working_hours: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
