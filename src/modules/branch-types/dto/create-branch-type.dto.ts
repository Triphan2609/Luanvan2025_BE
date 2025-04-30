import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBranchTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  key_name: string;
}
