import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Table } from './table.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationNumber: string;

  @Column({ type: 'timestamp' })
  reservationDate: Date;

  @Column({ type: 'time' })
  reservationTime: string;

  @Column()
  guestCount: number;

  @Column({ nullable: true })
  specialRequests: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToMany(() => Table)
  @JoinTable({
    name: 'reservation_tables',
    joinColumn: { name: 'reservation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'table_id', referencedColumnName: 'id' },
  })
  tables: Table[];

  @Column({ nullable: true })
  estimatedDuration: number; // in minutes

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id' })
  @Index()
  branchId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
