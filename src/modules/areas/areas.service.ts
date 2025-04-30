import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async findAll(): Promise<Area[]> {
    return this.areaRepository.find({ relations: ['branch'] });
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!area) {
      throw new NotFoundException('Khu vực không tồn tại');
    }
    return area;
  }

  async create(createAreaDto: CreateAreaDto): Promise<Area> {
    const branch = await this.branchRepository.findOne({
      where: { id: createAreaDto.branch_id },
    });
    if (!branch) {
      throw new NotFoundException('Chi nhánh không tồn tại');
    }

    const area = this.areaRepository.create({ ...createAreaDto, branch });
    return this.areaRepository.save(area);
  }

  async update(id: number, updateAreaDto: UpdateAreaDto): Promise<Area> {
    const area = await this.findOne(id);

    if (updateAreaDto.branch_id) {
      const branch = await this.branchRepository.findOne({
        where: { id: updateAreaDto.branch_id },
      });
      if (!branch) {
        throw new NotFoundException('Chi nhánh không tồn tại');
      }
      area.branch = branch;
    }

    Object.assign(area, updateAreaDto);
    return this.areaRepository.save(area);
  }

  async updateStatus(id: number, status: 'active' | 'inactive'): Promise<Area> {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) {
      throw new NotFoundException('Khu vực không tồn tại');
    }
    area.status = status;
    return this.areaRepository.save(area);
  }

  async remove(id: number): Promise<void> {
    const area = await this.findOne(id);
    await this.areaRepository.remove(area);
  }
}
