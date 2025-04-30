import { PartialType } from '@nestjs/mapped-types';
import { CreateAreaDto } from './create-area.dto';
import { IsEnum } from 'class-validator';

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  @IsEnum(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
  status: 'active' | 'inactive';
}
