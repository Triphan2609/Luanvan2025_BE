import {
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsString,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  branch_code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsInt()
  branch_type_id: number;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsNotEmpty()
  @IsString()
  working_days: string;

  @IsNotEmpty()
  @IsString()
  open_time: string;

  @IsNotEmpty()
  @IsString()
  close_time: string;

  @IsNotEmpty()
  @IsString()
  manager_name: string;

  @IsNotEmpty()
  @IsString()
  manager_phone: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  staff_count?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
