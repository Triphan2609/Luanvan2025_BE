import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { AttendanceType } from '../entities/attendance.entity';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsNumber()
  employee_shift_id?: number;

  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @IsOptional()
  @IsString()
  check_in?: string;

  @IsOptional()
  @IsString()
  check_out?: string;

  @IsOptional()
  @IsNumber()
  working_hours?: number;

  @IsOptional()
  @IsNumber()
  overtime_hours?: number;

  @IsOptional()
  @IsNumber()
  night_shift_hours?: number;

  @IsOptional()
  @IsNumber()
  holiday_hours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
