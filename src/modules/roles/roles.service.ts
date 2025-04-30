import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { permissions, ...roleData } = createRoleDto;

    // Lấy danh sách quyền từ cơ sở dữ liệu dựa trên ID
    const permissionEntities = permissions
      ? await this.permissionRepository.findByIds(permissions)
      : [];

    // Tạo đối tượng Role
    const role = this.roleRepository.create({
      ...roleData,
      permissions: permissionEntities,
    });

    return this.roleRepository.save(role);
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Vai trò không tồn tại');
    }
    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async delete(id: number): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Vai trò không tồn tại');
    }
    await this.roleRepository.remove(role);
  }
}
