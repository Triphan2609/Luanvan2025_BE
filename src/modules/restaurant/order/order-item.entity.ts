import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Food } from '../entities/food.entity';
import { RestaurantOrder } from './order.entity';

export enum OrderItemStatus {
  NEW = 'new',
  PREPARING = 'preparing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SERVED = 'served',
}

export enum OrderItemType {
  FOOD = 'food',
  SERVICE = 'service',
}

@Entity('restaurant_order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RestaurantOrder, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: RestaurantOrder;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Food, { nullable: true })
  @JoinColumn({ name: 'food_id' })
  food: Food;

  @Column({ name: 'food_id', type: 'uuid', nullable: true })
  foodId: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.NEW,
  })
  status: OrderItemStatus;

  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId: string;

  @Column({
    type: 'enum',
    enum: OrderItemType,
    default: OrderItemType.FOOD,
  })
  type: OrderItemType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
