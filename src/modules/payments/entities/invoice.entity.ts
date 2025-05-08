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

// Define the InvoiceStatus enum
export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
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

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  bookingId: string;

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];

  @Column({ default: false })
  isSent: boolean;

  @Column({ nullable: true })
  pdfPath: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
