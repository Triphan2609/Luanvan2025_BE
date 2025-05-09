import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from './payment.entity';
import { Branch } from '../../branches/entities/branch.entity';

// Define the InvoiceStatus enum
export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum InvoiceTarget {
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ nullable: true })
  bookingId: string;

  @Column({ nullable: true })
  restaurantOrderId: string;

  @Column({
    type: 'enum',
    enum: InvoiceTarget,
    default: InvoiceTarget.HOTEL,
  })
  target: InvoiceTarget;

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];

  @Column({ default: false })
  isSent: boolean;

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
