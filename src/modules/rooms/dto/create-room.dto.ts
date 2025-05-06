import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  Min,
} from 'class-validator';
import { RoomStatus } from '../entities/room.entity';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  roomCode: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  floor: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  capacity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(RoomStatus)
  status: RoomStatus;

  @IsArray()
  amenities: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  roomTypeId: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsArray()
  itemIds?: number[];
}
