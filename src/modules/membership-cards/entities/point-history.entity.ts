import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MembershipCard } from './membership-card.entity';

// Enum cho loại giao dịch điểm
export enum PointTransactionType {
  ADD = 'add', // Cộng điểm
  REDEEM = 'redeem', // Đổi điểm
  ADJUST = 'adjust', // Điều chỉnh (admin)
}

@Entity('point_history')
export class PointHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'card_id' })
  cardId: number;

  @ManyToOne(() => MembershipCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: MembershipCard;

  @Column()
  points: number;

  @Column({
    type: 'enum',
    enum: PointTransactionType,
    default: PointTransactionType.ADD,
  })
  type: PointTransactionType;

  @Column({ nullable: true })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, name: 'reward_id' })
  rewardId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
