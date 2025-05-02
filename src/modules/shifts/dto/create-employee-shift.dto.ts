import {
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ScheduleStatus,
  AttendanceStatus,
} from '../entities/employee-shift.entity';

export class CreateEmployeeShiftDto {
  @IsOptional()
  @IsString()
  schedule_code?: string;

  @IsNotEmpty()
  @IsInt()
  employee_id: number;

  @IsNotEmpty()
  @IsInt()
  shift_id: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendance_status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  check_in?: string;

  @IsOptional()
  @IsString()
  check_out?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
