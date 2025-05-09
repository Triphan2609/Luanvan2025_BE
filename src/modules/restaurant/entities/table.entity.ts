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
import { Area } from './area.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tableNumber: string;

  @Column()
  capacity: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  // Relation to Area entity
  @ManyToOne(() => Area, (area) => area.tables)
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ name: 'area_id', nullable: true })
  @Index()
  areaId: number;

  @Column({ default: false })
  isVIP: boolean;

  // Layout positioning
  @Column({ nullable: true })
  positionX: number;

  @Column({ nullable: true })
  positionY: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id' })
  @Index()
  branchId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
