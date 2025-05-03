import { IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity';

export class UpdateAttendanceStatusDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  approved_by?: number;

  @IsOptional()
  @IsString()
  adjustment_reason?: string;
}
