import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';

@Entity('floors')
export class Floor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  floorNumber: number;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  branchId: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Room, (room) => room.floor)
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
