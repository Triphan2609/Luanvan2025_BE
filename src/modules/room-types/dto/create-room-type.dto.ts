import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateRoomTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  bedCount: number;

  @IsNotEmpty()
  @IsString()
  bedType: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  basePrice: number;
}
