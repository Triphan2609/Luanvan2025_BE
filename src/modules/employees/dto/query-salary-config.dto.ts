import { IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { SalaryType } from '../entities/salary-config.entity';

export class QuerySalaryConfigDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  department_id?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  role_id?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  branch_id?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean => {
    if (value === 'true' || value === true || value === '1' || value === 1) {
      return true;
    }
    if (value === 'false' || value === false || value === '0' || value === 0) {
      return false;
    }
    return Boolean(value);
  })
  is_active?: boolean;

  @IsOptional()
  @IsEnum(SalaryType)
  salary_type?: SalaryType;
}
