import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Food } from '../../restaurant/entities/food.entity';

export enum MenuType {
  REGULAR = 'REGULAR',
  SEASONAL = 'SEASONAL',
  COMBO = 'COMBO',
}

export enum MenuSeason {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER',
}

export enum MenuStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: MenuType, default: MenuType.REGULAR })
  type: MenuType;

  @Column({ type: 'enum', enum: MenuSeason, nullable: true })
  season: MenuSeason;

  @Column({ type: 'float', nullable: true })
  price: number;

  @Column({
    type: 'enum',
    enum: MenuStatus,
    default: MenuStatus.ACTIVE,
  })
  status: MenuStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => Branch, (branch) => branch.menus)
  branch: Branch;

  @ManyToMany(() => Food)
  @JoinTable({
    name: 'menu_foods',
    joinColumn: { name: 'menu_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'food_id', referencedColumnName: 'id' },
  })
  foods: Food[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
