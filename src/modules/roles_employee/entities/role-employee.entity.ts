import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('roles_employee')
export class RoleEmployee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column()
  department_id: number;

  @OneToMany(() => Employee, (employee) => employee.role)
  employees: Employee[];
}
