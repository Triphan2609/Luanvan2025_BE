import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { Item } from '../../stuff/entities/item.entity';
import { Floor } from '../../floors/entities/floor.entity';

export enum RoomStatus {
  AVAILABLE = 'Available',
  BOOKED = 'Booked',
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  roomCode: string;

  @Column()
  floor: number;

  @Column()
  capacity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;

  @Column('simple-array')
  amenities: string[];

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  maintenanceEndDate: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  cleaningEndDate: Date | null;

  @ManyToOne(() => RoomType, { eager: true })
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @Column()
  roomTypeId: number;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => Floor, (floor) => floor.rooms)
  @JoinColumn({ name: 'floorId' })
  floorDetails: Floor;

  @Column({ nullable: true })
  floorId: number;

  @ManyToMany(() => Item, (item: Item) => item.rooms)
  @JoinTable({
    name: 'room_items',
    joinColumn: {
      name: 'roomId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'itemId',
      referencedColumnName: 'id',
    },
  })
  items: Item[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
