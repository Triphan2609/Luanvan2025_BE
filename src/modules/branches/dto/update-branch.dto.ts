import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateBranchDto extends PartialType(
  OmitType(CreateBranchDto, ['branch_code'] as const),
) {
  @IsOptional()
  @IsIn(['active', 'inactive'], {
    message: 'Trạng thái phải là "active" hoặc "inactive"',
  })
  status?: 'active' | 'inactive';
  branch_code?: never;
}
