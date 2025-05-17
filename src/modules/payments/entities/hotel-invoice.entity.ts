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

export enum HotelInvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELED = 'canceled',
  OVERDUE = 'overdue',
}

@Entity('hotel_invoices')
export class HotelInvoice {
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

  @Column({
    type: 'enum',
    enum: HotelInvoiceStatus,
    default: HotelInvoiceStatus.PENDING,
  })
  status: HotelInvoiceStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  bookingId: string;

  @OneToMany(() => Payment, (payment) => payment.hotelInvoice)
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
