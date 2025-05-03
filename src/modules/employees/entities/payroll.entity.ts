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
import { Employee } from './employee.entity';
import { SalaryConfig, SalaryType } from './salary-config.entity';

export enum PayrollStatus {
  DRAFT = 'draft', // Nháp, đang tính toán
  PENDING = 'pending', // Đang chờ duyệt
  FINALIZED = 'finalized', // Đã hoàn thiện
  PAID = 'paid', // Đã thanh toán
  CANCELLED = 'cancelled', // Đã hủy
}

export enum PayrollPeriodType {
  MONTHLY = 'monthly', // Hàng tháng
  BIWEEKLY = 'biweekly', // Hai tuần
  WEEKLY = 'weekly', // Hàng tuần
  DAILY = 'daily', // Hàng ngày
}

@Entity('payrolls')
@Index(['employee_id', 'period_start', 'period_end'], { unique: true })
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 20 })
  payroll_code: string; // Mã bảng lương (TL-202309-001)

  @ManyToOne(() => Employee, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id' })
  employee_id: number;

  @ManyToOne(() => SalaryConfig, { eager: true })
  @JoinColumn({ name: 'salary_config_id' })
  salary_config: SalaryConfig;

  @Column({ name: 'salary_config_id', nullable: true })
  salary_config_id: number;

  @Column({
    type: 'enum',
    enum: SalaryType,
    default: SalaryType.MONTHLY,
  })
  salary_type: SalaryType; // Loại lương được áp dụng

  @Column({ type: 'date' })
  period_start: Date; // Ngày bắt đầu kỳ lương

  @Column({ type: 'date' })
  period_end: Date; // Ngày kết thúc kỳ lương

  @Column({
    type: 'enum',
    enum: PayrollPeriodType,
    default: PayrollPeriodType.MONTHLY,
  })
  period_type: PayrollPeriodType; // Loại kỳ lương

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  base_salary: number; // Lương cơ bản

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  hourly_rate: number; // Mức lương giờ

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  shift_rate: number; // Mức lương ca

  @Column({ type: 'int', default: 0 })
  working_days: number; // Số ngày công làm việc

  @Column({ type: 'float', default: 0 })
  total_working_hours: number; // Tổng số giờ làm việc

  @Column({ type: 'float', default: 0 })
  overtime_hours: number; // Số giờ làm thêm

  @Column({ type: 'float', default: 0 })
  night_shift_hours: number; // Số giờ làm ca đêm

  @Column({ type: 'float', default: 0 })
  holiday_hours: number; // Số giờ làm ngày lễ

  @Column({ type: 'int', default: 0 })
  total_shifts: number; // Tổng số ca làm việc

  @Column({ type: 'float', default: 0 })
  overtime_multiplier: number; // Hệ số lương tăng ca

  @Column({ type: 'float', default: 0 })
  night_shift_multiplier: number; // Hệ số lương ca đêm

  @Column({ type: 'float', default: 0 })
  holiday_multiplier: number; // Hệ số lương ngày lễ

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  normal_salary: number; // Lương ngày công bình thường

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  overtime_pay: number; // Tiền lương làm thêm giờ

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  night_shift_pay: number; // Tiền lương ca đêm

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  holiday_pay: number; // Tiền lương ngày lễ

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  allowances: number; // Tổng phụ cấp

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  meal_allowance: number; // Phụ cấp ăn uống

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  transport_allowance: number; // Phụ cấp đi lại

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  housing_allowance: number; // Phụ cấp nhà ở

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  position_allowance: number; // Phụ cấp chức vụ

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  attendance_bonus: number; // Tiền thưởng chuyên cần

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  performance_bonus: number; // Tiền thưởng hiệu suất

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  deductions: number; // Tổng khấu trừ

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  tax: number; // Thuế TNCN

  @Column({ type: 'float', default: 0 })
  tax_rate: number; // Thuế suất áp dụng

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  insurance: number; // Bảo hiểm (BHXH, BHYT, BHTN)

  @Column({ type: 'float', default: 0 })
  insurance_rate: number; // Tỉ lệ bảo hiểm áp dụng

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  other_deductions: number; // Khấu trừ khác

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  gross_pay: number; // Tổng thu nhập (Trước thuế)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  net_pay: number; // Lương thực lãnh (Sau thuế)

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus; // Trạng thái bảng lương

  @Column({ nullable: true, type: 'date' })
  payment_date: Date; // Ngày thanh toán

  @Column({ nullable: true })
  created_by: number; // ID người tạo

  @Column({ nullable: true })
  approved_by: number; // ID người duyệt

  @Column({ nullable: true, type: 'timestamp' })
  approved_at: Date; // Thời gian duyệt

  @Column({ nullable: true, type: 'json' })
  attendance_data: string; // Dữ liệu chấm công chi tiết (JSON)

  @Column({ nullable: true, type: 'text' })
  notes: string; // Ghi chú

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
