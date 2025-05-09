import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from '../entities/menu.entity';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    // Create a new menu entity
    const menu = new Menu();
    // Copy properties from DTO to entity
    Object.assign(menu, createMenuDto);

    // Save the entity
    return this.menuRepository.save(menu);
  }

  async findAll(
    query: Record<string, any>,
  ): Promise<{ data: Menu[]; total: number }> {
    const { page = 1, limit = 10, branchId, status, type, name } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.menuRepository.createQueryBuilder('menu');

    // Apply filters
    if (branchId) {
      queryBuilder.andWhere('menu.branchId = :branchId', { branchId });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('menu.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('menu.type = :type', { type });
    }

    if (name) {
      queryBuilder.andWhere('menu.name LIKE :name', { name: `%${name}%` });
    }

    // Count total items for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Order by created date descending
    queryBuilder.orderBy('menu.createdAt', 'DESC');

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findOne(id: string): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: ['foods'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    return menu;
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.findOne(id);

    // Update the menu properties
    Object.assign(menu, updateMenuDto);

    return this.menuRepository.save(menu);
  }

  async remove(id: string): Promise<void> {
    const result = await this.menuRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }
  }
}
