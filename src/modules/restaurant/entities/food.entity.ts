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
import { FoodCategory } from './food-category.entity';
import { Menu } from '../menu/menu.entity';

export enum FoodStatus {
  AVAILABLE = 'available',
  SOLD_OUT = 'sold_out',
  INACTIVE = 'inactive',
}

@Entity('foods')
export class Food {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: FoodStatus,
    default: FoodStatus.AVAILABLE,
  })
  status: FoodStatus;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  ingredients: string;

  @Column({ default: false })
  isVegetarian: boolean;

  @Column({ default: false })
  isVegan: boolean;

  @Column({ default: false })
  isGlutenFree: boolean;

  @Column({ nullable: true })
  spicyLevel: number;

  @Column({ nullable: true })
  preparationTime: number; // in minutes

  @ManyToOne(() => FoodCategory)
  @JoinColumn({ name: 'category_id' })
  category: FoodCategory;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToMany(() => Menu)
  @JoinTable({
    name: 'menu_foods',
    joinColumn: { name: 'food_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'menu_id', referencedColumnName: 'id' },
  })
  menus: Menu[];

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id', type: 'int' })
  @Index()
  branchId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
