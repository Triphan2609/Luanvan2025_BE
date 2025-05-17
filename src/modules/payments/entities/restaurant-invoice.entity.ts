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
import { Payment } from './payment.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum RestaurantInvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELED = 'canceled',
  OVERDUE = 'overdue',
}

@Entity('restaurant_invoices')
export class RestaurantInvoice {
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
    enum: RestaurantInvoiceStatus,
    default: RestaurantInvoiceStatus.PENDING,
  })
  status: RestaurantInvoiceStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  restaurantOrderId: string;

  @OneToMany(() => Payment, (payment) => payment.restaurantInvoice)
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
