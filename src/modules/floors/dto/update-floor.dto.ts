import { PartialType } from '@nestjs/mapped-types';
import { CreateFloorDto } from './create-floor.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFloorDto extends PartialType(CreateFloorDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
