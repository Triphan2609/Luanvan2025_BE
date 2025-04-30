import { IsInt, IsOptional } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  username?: string;

  @IsOptional()
  fullName?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  @IsInt() // Đảm bảo roleId là số nguyên
  roleId?: number;
}
