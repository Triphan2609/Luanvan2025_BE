import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { RoleEmployee } from '../../roles_employee/entities/role-employee.entity';
import { EmployeeShift } from '../../shifts/entities/employee-shift.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  employee_code: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, type: 'text' })
  avatar: string;

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({ type: 'date' })
  join_date: Date;

  @ManyToOne(() => Department, (department) => department.employees)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => RoleEmployee, (role) => role.employees)
  @JoinColumn({ name: 'role_id' })
  role: RoleEmployee;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({
    type: 'enum',
    enum: ['active', 'on_leave', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'on_leave' | 'inactive';

  @OneToMany(() => EmployeeShift, (employeeShift) => employeeShift.employee)
  shifts: EmployeeShift[];
}
