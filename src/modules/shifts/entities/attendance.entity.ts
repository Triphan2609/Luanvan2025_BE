import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { EmployeeShift } from './employee-shift.entity';

export enum AttendanceType {
  NORMAL = 'normal', // Chấm công bình thường
  OVERTIME = 'overtime', // Làm thêm giờ
  MAKEUP = 'makeup', // Bù công
  NIGHT_SHIFT = 'night_shift', // Ca đêm
  HOLIDAY = 'holiday', // Ngày lễ
}

export enum AttendanceStatus {
  PENDING = 'pending', // Đang chờ xác nhận
  APPROVED = 'approved', // Đã được chấp nhận
  REJECTED = 'rejected', // Đã bị từ chối
  ADJUSTED = 'adjusted', // Đã điều chỉnh
}

@Entity('attendances')
@Index(['employee_id', 'date'], { unique: false })
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Employee, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id' })
  employee_id: number;

  @ManyToOne(() => EmployeeShift, { nullable: true })
  @JoinColumn({ name: 'employee_shift_id' })
  employeeShift: EmployeeShift;

  @Column({ name: 'employee_shift_id', nullable: true })
  employee_shift_id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time', nullable: true })
  check_in: string;

  @Column({ type: 'time', nullable: true })
  check_out: string;

  @Column({ type: 'float', default: 0 })
  working_hours: number;

  @Column({ type: 'float', default: 0 })
  overtime_hours: number;

  @Column({ type: 'float', default: 0 })
  night_shift_hours: number;

  @Column({ type: 'float', default: 0 })
  holiday_hours: number;

  @Column({
    type: 'enum',
    enum: AttendanceType,
    default: AttendanceType.NORMAL,
  })
  type: AttendanceType;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PENDING,
  })
  status: AttendanceStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: false })
  is_adjustment: boolean;

  @Column({ nullable: true, type: 'text' })
  adjustment_reason: string;

  @Column({ nullable: true })
  requested_by: number; // ID của người yêu cầu điều chỉnh

  @Column({ nullable: true })
  approved_by: number; // ID của người duyệt

  @Column({ nullable: true, type: 'timestamp' })
  approved_at: Date; // Thời gian duyệt

  @Column({ default: false })
  is_processed: boolean; // Đã được xử lý trong tính lương chưa

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
