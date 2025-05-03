import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollPeriodType, PayrollStatus } from '../entities/payroll.entity';

class PayrollAllowanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  meal_allowance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transport_allowance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  housing_allowance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position_allowance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  attendance_bonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  performance_bonus?: number;
}

class PayrollDeductionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insurance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  other_deductions?: number;
}

export class CreatePayrollDto {
  @IsNotEmpty()
  @IsNumber()
  employee_id: number;

  @IsOptional()
  @IsNumber()
  salary_config_id?: number;

  @IsNotEmpty()
  @IsDateString()
  period_start: string;

  @IsNotEmpty()
  @IsDateString()
  period_end: string;

  @IsEnum(PayrollPeriodType)
  period_type: PayrollPeriodType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  base_salary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  working_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_working_hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime_hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  night_shift_hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  holiday_hours?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollAllowanceDto)
  allowances?: PayrollAllowanceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollDeductionDto)
  deductions?: PayrollDeductionDto;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @IsOptional()
  @IsNumber()
  created_by?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
