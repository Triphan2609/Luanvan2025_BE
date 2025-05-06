import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAmenityDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;
}
