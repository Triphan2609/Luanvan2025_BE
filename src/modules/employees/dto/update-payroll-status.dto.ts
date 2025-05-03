import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
} from 'class-validator';
import { PayrollStatus } from '../entities/payroll.entity';

export class UpdatePayrollStatusDto {
  @IsNotEmpty()
  @IsEnum(PayrollStatus)
  status: PayrollStatus;

  @IsOptional()
  @IsNumber()
  approved_by?: number;

  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
