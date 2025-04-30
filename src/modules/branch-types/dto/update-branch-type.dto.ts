import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchTypeDto } from './create-branch-type.dto';

export class UpdateBranchTypeDto extends PartialType(CreateBranchTypeDto) {
  key_name?: never; // Không cho phép chỉnh sửa `key_name`
}
