import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, OrderPriority } from '../order.entity';
import { CreateOrderItemDto } from './create-order.dto';
import { OrderItemStatus } from '../order-item.entity';

export class UpdateOrderItemDto extends CreateOrderItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(OrderItemStatus)
  @IsOptional()
  declare status?: OrderItemStatus;
}

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(OrderPriority)
  @IsOptional()
  priority?: OrderPriority;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  completionNote?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  items?: UpdateOrderItemDto[];
}
