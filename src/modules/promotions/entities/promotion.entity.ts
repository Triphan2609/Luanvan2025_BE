import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Menu } from '../../restaurant/menu/menu.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum PromotionType {
  ITEM = 'ITEM',
  BILL = 'BILL',
  COMBO = 'COMBO',
  TIME = 'TIME',
}

export enum PromotionValueType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

export enum PromotionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  @Column('float', { nullable: true })
  value: number;

  @Column({ type: 'enum', enum: PromotionValueType, nullable: true })
  valueType: PromotionValueType;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.ACTIVE,
  })
  status: PromotionStatus;

  @Column({ type: 'float', nullable: true })
  minOrderValue: number;

  @Column({ type: 'varchar', nullable: true })
  timeRange: string;

  @ManyToOne(() => Branch, { nullable: true })
  branch: Branch;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToMany(() => Menu, { nullable: true })
  @JoinTable()
  menus: Menu[];

  @Column()
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
