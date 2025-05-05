import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Enum cho trạng thái phần thưởng
export enum RewardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  points: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({
    type: 'enum',
    enum: RewardStatus,
    default: RewardStatus.ACTIVE,
  })
  status: RewardStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
