import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AttendanceStatus,
  AttendanceType,
} from '../entities/attendance.entity';

export class CreateAttendanceDto {
  @IsNumber()
  employee_id: number;

  @IsOptional()
  @IsNumber()
  employee_shift_id?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  check_in?: string;

  @IsOptional()
  @IsString()
  check_out?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  working_hours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtime_hours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  night_shift_hours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  holiday_hours?: number;

  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_adjustment?: boolean;

  @IsOptional()
  @IsString()
  adjustment_reason?: string;

  @IsOptional()
  @IsNumber()
  requested_by?: number;
}
