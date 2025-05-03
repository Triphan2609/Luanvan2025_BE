import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { RoleEmployee } from '../../roles_employee/entities/role-employee.entity';

export enum SalaryType {
  MONTHLY = 'monthly', // Lương tháng cố định
  HOURLY = 'hourly', // Lương giờ (công nhật)
  SHIFT = 'shift', // Theo ca
}

@Entity('salary_configs')
@Unique(['department_id', 'role_id', 'salary_type'])
@Index(['department_id', 'role_id'])
export class SalaryConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Department, { eager: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id' })
  department_id: number;

  @ManyToOne(() => RoleEmployee, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: RoleEmployee;

  @Column({ name: 'role_id' })
  role_id: number;

  @Column({
    type: 'enum',
    enum: SalaryType,
    default: SalaryType.MONTHLY,
  })
  salary_type: SalaryType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  base_salary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  hourly_rate: number; // Mức lương theo giờ

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  shift_rate: number; // Mức lương theo ca

  @Column({ type: 'float', default: 1.5 })
  overtime_multiplier: number; // Hệ số lương tăng ca

  @Column({ type: 'float', default: 1.3 })
  night_shift_multiplier: number; // Hệ số lương ca đêm

  @Column({ type: 'float', default: 2.0 })
  holiday_multiplier: number; // Hệ số lương ngày lễ

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  meal_allowance: number; // Phụ cấp ăn uống

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  transport_allowance: number; // Phụ cấp đi lại

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  housing_allowance: number; // Phụ cấp nhà ở

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  position_allowance: number; // Phụ cấp chức vụ

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  attendance_bonus: number; // Thưởng chuyên cần

  @Column({ type: 'float', default: 0.1 })
  tax_rate: number; // Thuế suất TNCN

  @Column({ type: 'float', default: 0.105 })
  insurance_rate: number; // Tỉ lệ BHXH, BHYT, BHTN

  @Column({ type: 'int', default: 8 })
  standard_hours_per_day: number; // Số giờ làm việc tiêu chuẩn mỗi ngày

  @Column({ type: 'int', default: 22 })
  standard_days_per_month: number; // Số ngày làm việc tiêu chuẩn mỗi tháng

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true, type: 'text' })
  description: string; // Mô tả về cấu hình lương

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
