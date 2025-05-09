import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { PaymentMethod } from './payment-method.entity';
import { Branch } from '../../branches/entities/branch.entity';

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

export enum PaymentTarget {
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
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

  @Column({
    type: 'enum',
    enum: PaymentTarget,
    default: PaymentTarget.HOTEL,
  })
  target: PaymentTarget;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ nullable: true })
  bookingId: string;

  @Column({ nullable: true })
  restaurantOrderId: string;

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
