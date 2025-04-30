import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['hotel', 'restaurant'])
  @IsNotEmpty()
  type: 'hotel' | 'restaurant';

  @IsInt()
  @IsNotEmpty()
  branch_id: number;
}
