import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { ItemCategory } from './item-category.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Branch } from '../../branches/entities/branch.entity';

// Define item types enum
export enum ItemType {
  LONG_TERM = 'long_term',
  SINGLE_USE = 'single_use',
  MULTIPLE_USE = 'multiple_use',
}

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  stockQuantity: number;

  @Column({ default: 0 })
  inUseQuantity: number;

  @Column({
    type: 'enum',
    enum: ItemType,
    default: ItemType.LONG_TERM,
  })
  itemType: ItemType;

  // For multiple-use items, track how many uses are left
  @Column({ default: 0 })
  maxUses: number;

  @Column({ default: 0 })
  currentUses: number;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  unitPrice: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => ItemCategory, (category) => category.items)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  @Column()
  categoryId: number;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @ManyToMany('Room', 'items')
  rooms: Room[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
