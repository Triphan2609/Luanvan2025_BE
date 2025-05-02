import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class CreateRoleEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  department_id: number;
}
