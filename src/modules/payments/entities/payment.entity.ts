import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { HotelInvoice } from './hotel-invoice.entity';
import { RestaurantInvoice } from './restaurant-invoice.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REFUNDED = 'refunded',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

export enum PaymentType {
  DEPOSIT = 'deposit',
  FULL = 'full',
  EXTRA = 'extra',
  REFUND = 'refund',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.FULL,
  })
  type: PaymentType;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => HotelInvoice, { nullable: true })
  @JoinColumn({ name: 'hotelInvoiceId' })
  hotelInvoice: HotelInvoice;

  @Column({ nullable: true })
  hotelInvoiceId: string;

  @ManyToOne(() => RestaurantInvoice, { nullable: true })
  @JoinColumn({ name: 'restaurantInvoiceId' })
  restaurantInvoice: RestaurantInvoice;

  @Column({ nullable: true })
  restaurantInvoiceId: string;

  @ManyToOne(() => PaymentMethod)
  @JoinColumn({ name: 'methodId' })
  method: PaymentMethod;

  @Column()
  methodId: number;

  @ManyToOne(() => Branch, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
