import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from '../entities/area.entity';
import { CreateRestaurantAreaDto } from '../dto/create-area.dto';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
  ) {}

  async create(createAreaDto: CreateRestaurantAreaDto): Promise<Area> {
    const area = this.areaRepository.create(createAreaDto);
    return await this.areaRepository.save(area);
  }

  async findAll(branchId?: number, includeInactive = false): Promise<Area[]> {
    const query = this.areaRepository.createQueryBuilder('area');

    if (branchId) {
      query.where('area.branchId = :branchId', { branchId });
    }

    if (!includeInactive) {
      query.andWhere('area.isActive = :isActive', { isActive: true });
    }

    return query.orderBy('area.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return area;
  }

  async update(
    id: number,
    updateAreaDto: Partial<CreateRestaurantAreaDto>,
  ): Promise<Area> {
    const area = await this.findOne(id);
    this.areaRepository.merge(area, updateAreaDto);
    return this.areaRepository.save(area);
  }

  async activate(id: number): Promise<Area> {
    const area = await this.findOne(id);
    area.isActive = true;
    return this.areaRepository.save(area);
  }

  async deactivate(id: number): Promise<Area> {
    const area = await this.findOne(id);
    area.isActive = false;
    return this.areaRepository.save(area);
  }

  async remove(id: number): Promise<void> {
    const area = await this.findOne(id);
    await this.areaRepository.remove(area);
  }

  async createDefaultAreas(branchId: number): Promise<Area[]> {
    const defaultAreas = [
      {
        name: 'Khu vực chính',
        description: 'Khu vực ăn uống chính của nhà hàng',
        branchId,
      },
      {
        name: 'Khu vực VIP',
        description: 'Khu vực dành cho khách VIP',
        branchId,
      },
      {
        name: 'Khu vực ngoài trời',
        description: 'Khu vực bàn ăn ngoài trời',
        branchId,
      },
      {
        name: 'Khu vực quầy bar',
        description: 'Khu vực quầy bar và đồ uống',
        branchId,
      },
    ];

    const areas = this.areaRepository.create(defaultAreas);
    return this.areaRepository.save(areas);
  }
}
