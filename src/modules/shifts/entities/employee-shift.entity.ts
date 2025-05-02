import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Shift } from './shift.entity';

export enum ScheduleStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
}

export enum AttendanceStatus {
  NORMAL = 'normal',
  LATE = 'late',
  EARLY_LEAVE = 'early_leave',
  ABSENT = 'absent',
}

@Entity('employee_shifts')
export class EmployeeShift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 10, nullable: true })
  schedule_code: string; // Mã lịch làm (LS001, LS002...)

  @ManyToOne(() => Employee, (employee) => employee.shifts, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id' })
  employee_id: number;

  @ManyToOne(() => Shift, (shift) => shift.employeeShifts, { eager: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ name: 'shift_id' })
  shift_id: number;

  @Column({ type: 'date' })
  date: Date; // Ngày làm việc

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.PENDING,
  })
  status: ScheduleStatus; // Trạng thái lịch làm việc (chờ xác nhận, đã xác nhận, đã hoàn thành)

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.NORMAL,
    nullable: true,
  })
  attendance_status: AttendanceStatus; // Trạng thái điểm danh (bình thường, đi muộn, về sớm, vắng mặt)

  @Column({ nullable: true, type: 'time' })
  check_in: string; // Thời gian check-in

  @Column({ nullable: true, type: 'time' })
  check_out: string; // Thời gian check-out

  @Column({ nullable: true, type: 'text' })
  note: string; // Ghi chú

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
