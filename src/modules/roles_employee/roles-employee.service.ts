import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEmployee } from './entities/role-employee.entity';
import { CreateRoleEmployeeDto } from './dto/create-role-employee.dto';
import { UpdateRoleEmployeeDto } from './dto/update-role-employee.dto';

@Injectable()
export class RolesEmployeeService {
  constructor(
    @InjectRepository(RoleEmployee)
    private readonly roleEmployeeRepository: Repository<RoleEmployee>,
  ) {}

  async create(
    createRoleEmployeeDto: CreateRoleEmployeeDto,
  ): Promise<RoleEmployee> {
    const role = this.roleEmployeeRepository.create(createRoleEmployeeDto);
    return this.roleEmployeeRepository.save(role);
  }

  async findAll(): Promise<RoleEmployee[]> {
    return this.roleEmployeeRepository.find({
      relations: ['department', 'employees'],
    });
  }

  async findOne(id: number): Promise<RoleEmployee> {
    const role = await this.roleEmployeeRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(
    id: number,
    updateRoleEmployeeDto: UpdateRoleEmployeeDto,
  ): Promise<RoleEmployee> {
    const role = await this.roleEmployeeRepository.preload({
      id,
      ...updateRoleEmployeeDto,
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return this.roleEmployeeRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    const result = await this.roleEmployeeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Role not found');
    }
  }

  async getEmployeeCount(id: number): Promise<{ count: number }> {
    const role = await this.roleEmployeeRepository.findOne({
      where: { id },
      relations: ['employees', 'department'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return { count: role.employees?.length || 0 };
  }
}
