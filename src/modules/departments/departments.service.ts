import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepository.create(createDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Department[]> {
    return this.departmentRepository.find({
      relations: ['employees', 'branch'],
    });
  }

  async findByBranch(branchId: number): Promise<Department[]> {
    return this.departmentRepository.find({
      where: { branch_id: branchId },
      relations: ['branch'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(
    id: number,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.departmentRepository.preload({
      id,
      ...updateDepartmentDto,
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return this.departmentRepository.save(department);
  }

  async remove(id: number): Promise<void> {
    const result = await this.departmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Department not found');
    }
  }

  async getEmployeeCount(id: number): Promise<{ count: number }> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['employees'],
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return { count: department.employees?.length || 0 };
  }
}
