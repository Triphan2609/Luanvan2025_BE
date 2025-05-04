import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import {
  AttendanceStatus,
  AttendanceType,
} from '../entities/attendance.entity';
import { Transform } from 'class-transformer';

export class QueryAttendanceDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  employee_id?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  department_id?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  branch_id?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  employee_shift_id?: number;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean => value === 'true' || value === true)
  is_adjustment?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean => value === 'true' || value === true)
  is_processed?: boolean;
}
