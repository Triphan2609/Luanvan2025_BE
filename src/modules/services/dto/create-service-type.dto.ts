import { IsString, IsOptional } from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
