import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleEmployeeDto } from './create-role-employee.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateRoleEmployeeDto extends PartialType(CreateRoleEmployeeDto) {
  @IsOptional()
  @IsInt()
  department_id?: number;
}
