import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsEnum,
  IsPositive,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { SalaryType } from '../entities/salary-config.entity';

export class CreateSalaryConfigDto {
  @IsNotEmpty()
  @IsNumber()
  department_id: number;

  @IsNotEmpty()
  @IsNumber()
  role_id: number;

  @IsEnum(SalaryType)
  salary_type: SalaryType;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  base_salary: number;

  @ValidateIf((o: CreateSalaryConfigDto) => o.salary_type === SalaryType.HOURLY)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty({ message: 'Mức lương giờ là bắt buộc khi chọn loại lương giờ' })
  hourly_rate?: number;

  @ValidateIf((o: CreateSalaryConfigDto) => o.salary_type === SalaryType.SHIFT)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty({ message: 'Mức lương ca là bắt buộc khi chọn loại lương ca' })
  shift_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overtime_multiplier?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  night_shift_multiplier?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  holiday_multiplier?: number;

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
  @Max(1)
  tax_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  insurance_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  standard_hours_per_day?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  standard_days_per_month?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
