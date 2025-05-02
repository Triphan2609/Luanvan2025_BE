import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDate,
  IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateEmployeeDto {
  @IsString()
  employee_code: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    return new Date(value);
  })
  birthday?: Date;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  join_date: Date;

  @IsInt()
  department_id: number;

  @IsInt()
  role_id: number;

  @IsOptional()
  @IsEnum(['active', 'on_leave', 'inactive'])
  status?: 'active' | 'on_leave' | 'inactive';
}
