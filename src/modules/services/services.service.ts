import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async findAll(): Promise<Service[]> {
    return this.serviceRepository.find({ relations: ['branch'] });
  }

  async findOne(id: number): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }
    return service;
  }

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const branch = await this.branchRepository.findOne({
      where: { id: createServiceDto.branch_id },
    });
    if (!branch) {
      throw new NotFoundException('Chi nhánh không tồn tại');
    }

    const service = this.serviceRepository.create({
      ...createServiceDto,
      branch,
    });
    return this.serviceRepository.save(service);
  }

  async update(
    id: number,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    const service = await this.findOne(id);

    if (updateServiceDto.branch_id) {
      const branch = await this.branchRepository.findOne({
        where: { id: updateServiceDto.branch_id },
      });
      if (!branch) {
        throw new NotFoundException('Chi nhánh không tồn tại');
      }
      service.branch = branch;
    }

    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: number): Promise<void> {
    const service = await this.findOne(id);
    await this.serviceRepository.remove(service);
  }
}
