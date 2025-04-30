import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BranchType } from '../../branch-types/entities/branch-type.entity';
import { Service } from '../../services/entities/service.entity';
import { Area } from 'src/modules/areas/entities/area.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  branch_code: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  email: string;

  @ManyToOne(() => BranchType, (branchType) => branchType.branches, {
    eager: true,
  })
  @JoinColumn({ name: 'branch_type_id' }) // Liên kết với bảng branch_types
  branchType: BranchType;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Column()
  working_days: string;

  @Column({ type: 'time' })
  open_time: string;

  @Column({ type: 'time' })
  close_time: string;

  @Column()
  manager_name: string;

  @Column()
  manager_phone: string;

  @Column({ type: 'int', default: 0 })
  staff_count: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => Service, (service) => service.branch)
  services: Service[];

  @OneToMany(() => Area, (area) => area.branch)
  areas: Area[]; // Mối quan hệ ngược với Area
}
