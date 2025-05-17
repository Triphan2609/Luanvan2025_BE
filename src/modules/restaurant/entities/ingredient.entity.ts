import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unit } from './unit.entity';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Unit)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId: string;

  @Column({ type: 'float', default: 0 })
  quantity: number; // Số lượng tồn kho

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['available', 'low', 'out'],
    default: 'available',
  })
  status: 'available' | 'low' | 'out';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
