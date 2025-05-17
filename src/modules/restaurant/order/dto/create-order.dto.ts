import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderPriority } from '../order.entity';
import { OrderItemStatus } from '../order-item.entity';

export class CreateOrderItemDto {
  @IsUUID()
  @IsOptional()
  foodId?: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(['food', 'service'])
  @IsOptional()
  type?: string;

  @IsEnum(OrderItemStatus)
  @IsOptional()
  status?: OrderItemStatus;
}

export class CreateOrderDto {
  @IsNumber()
  @IsOptional()
  tableId?: number;

  @IsString()
  @IsOptional()
  tableNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items: CreateOrderItemDto[];

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(OrderPriority)
  @IsOptional()
  priority?: OrderPriority;

  @IsNumber()
  branchId: number;
}
