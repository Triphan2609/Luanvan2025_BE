import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

export enum MenuStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum MenuType {
  REGULAR = 'regular',
  SEASONAL = 'seasonal',
  SPECIAL = 'special',
}

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MenuStatus,
    default: MenuStatus.ACTIVE,
  })
  status: MenuStatus;

  @Column({
    type: 'enum',
    enum: MenuType,
    default: MenuType.REGULAR,
  })
  type: MenuType;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

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
