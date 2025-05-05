import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsEmail, IsOptional } from 'class-validator';
import { Branch } from '../../branches/entities/branch.entity';

export enum CustomerType {
  NORMAL = 'normal',
  VIP = 'vip',
}

export enum CustomerStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  customer_code: string;

  @Column()
  name: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  @IsEmail()
  @IsOptional()
  email: string;

  @Column({ name: 'id_number', unique: true })
  idNumber: string;

  @Column({
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.NORMAL,
  })
  type: CustomerType;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  note: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ nullable: true })
  birthday: Date;

  @Column({ name: 'total_bookings', default: 0 })
  totalBookings: number;

  @Column({
    name: 'total_spent',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalSpent: number;

  @Column({ name: 'last_visit', nullable: true })
  lastVisit: Date;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
