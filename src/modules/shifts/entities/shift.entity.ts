import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EmployeeShift } from './employee-shift.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 10, nullable: true })
  shift_code: string; // Mã ca làm (CA001, CA002,...)

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ShiftType,
    default: ShiftType.MORNING,
  })
  type: ShiftType;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ nullable: true })
  break_time: string; // Thời gian nghỉ (format: "11:30-12:30")

  @Column({ type: 'float', default: 8 })
  working_hours: number; // Số giờ làm việc

  @Column({ nullable: true, type: 'text' })
  description: string; // Mô tả ca làm việc

  @Column({ default: true })
  is_active: boolean; // Trạng thái hoạt động

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ nullable: true })
  branch_id: number;

  @OneToMany(() => EmployeeShift, (employeeShift) => employeeShift.shift)
  employeeShifts: EmployeeShift[];
}
