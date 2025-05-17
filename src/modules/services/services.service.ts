import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { ServiceType } from './entities/service-type.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepository: Repository<ServiceType>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  // Service Type methods
  async createServiceType(
    createServiceTypeDto: CreateServiceTypeDto,
  ): Promise<ServiceType> {
    const data = {
      ...createServiceTypeDto,
      branchId: createServiceTypeDto.branchId
        ? parseInt(createServiceTypeDto.branchId as any, 10)
        : undefined,
    };
    const serviceType = this.serviceTypeRepository.create(data);
    return await this.serviceTypeRepository.save(serviceType);
  }

  async findAllServiceTypes(branchId?: number): Promise<ServiceType[]> {
    const query = this.serviceTypeRepository
      .createQueryBuilder('serviceType')
      .leftJoinAndSelect('serviceType.services', 'services');

    if (branchId) {
      query.where('serviceType.branchId = :branchId', { branchId });
    }

    return await query.getMany();
  }

  async findServiceTypeById(id: string): Promise<ServiceType> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: { id },
      relations: ['services'],
    });

    if (!serviceType) {
      throw new NotFoundException(`Service type with ID ${id} not found`);
    }

    return serviceType;
  }

  async updateServiceType(
    id: string,
    updateData: Partial<CreateServiceTypeDto>,
  ): Promise<ServiceType> {
    const serviceType = await this.findServiceTypeById(id);
    Object.assign(serviceType, updateData);
    return await this.serviceTypeRepository.save(serviceType);
  }

  async deleteServiceType(id: string): Promise<void> {
    const result = await this.serviceTypeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Service type with ID ${id} not found`);
    }
  }

  // Service methods
  async createService(createServiceDto: CreateServiceDto): Promise<Service> {
    const data = {
      ...createServiceDto,
      serviceTypeId: String(createServiceDto.serviceTypeId),
      branchId: createServiceDto.branchId
        ? parseInt(createServiceDto.branchId as any, 10)
        : undefined,
      description: createServiceDto.description ?? '',
    };
    const service = this.serviceRepository.create(data);
    return await this.serviceRepository.save(service);
  }

  async findAllServices(
    branchId?: number,
    serviceTypeId?: string,
  ): Promise<(Service & { status: string })[]> {
    const query = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.serviceType', 'serviceType')
      .leftJoinAndSelect('service.branch', 'branch');

    if (branchId) {
      query.where('service.branchId = :branchId', { branchId });
    }

    if (serviceTypeId) {
      query.andWhere('service.serviceTypeId = :serviceTypeId', {
        serviceTypeId,
      });
    }

    const services = await query.getMany();
    return services.map((s) => ({
      ...s,
      status: s.isActive ? 'active' : 'inactive',
    })) as (Service & { status: string })[];
  }

  async findServiceById(id: string): Promise<Service & { status: string }> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['serviceType', 'branch'],
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return {
      ...service,
      status: service.isActive ? 'active' : 'inactive',
    } as Service & { status: string };
  }

  async updateService(
    id: string,
    updateData: Partial<CreateServiceDto>,
  ): Promise<Service> {
    const service = await this.findServiceById(id);
    Object.assign(service, updateData);
    return await this.serviceRepository.save(service);
  }

  async deleteService(id: string): Promise<void> {
    const result = await this.serviceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
  }

  async useService(serviceId: string, quantity: number) {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.stock < quantity) throw new Error('Not enough stock');
    service.stock -= quantity;
    await this.serviceRepository.save(service);
  }
}
