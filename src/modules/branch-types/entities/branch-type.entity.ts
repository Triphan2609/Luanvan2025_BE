import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity'; // Import Branch entity

@Entity('branch_types')
export class BranchType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  key_name: string;

  @OneToMany(() => Branch, (branch) => branch.branchType)
  branches: Branch[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
