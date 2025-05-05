import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

// Enum cho loại thẻ thành viên
export enum MembershipCardType {
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

// Enum cho trạng thái thẻ
export enum MembershipCardStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
}

@Entity('membership_cards')
export class MembershipCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MembershipCardType,
    default: MembershipCardType.SILVER,
  })
  type: MembershipCardType;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  totalSpent: number;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'date',
    nullable: true,
  })
  issueDate: Date;

  @Column({
    type: 'date',
    nullable: true,
  })
  expireDate: Date;

  @Column({
    type: 'enum',
    enum: MembershipCardStatus,
    default: MembershipCardStatus.ACTIVE,
  })
  status: MembershipCardStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
