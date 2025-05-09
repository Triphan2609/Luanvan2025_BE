import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from '../entities/table.entity';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';

interface TableQueryParams {
  page?: number;
  limit?: number;
  branchId?: number;
  status?: TableStatus;
  areaId?: number;
  isVIP?: boolean | string;
  isActive?: boolean | string;
}

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async create(createTableDto: CreateTableDto): Promise<Table> {
    // Create a new table entity
    const table = new Table();
    // Copy properties from DTO to entity
    Object.assign(table, createTableDto);

    // Save the entity
    return this.tableRepository.save(table);
  }

  async findAll(
    query: TableQueryParams,
  ): Promise<{ data: Table[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      branchId,
      status,
      areaId,
      isVIP,
      isActive,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tableRepository.createQueryBuilder('table');
    queryBuilder.leftJoinAndSelect('table.area', 'area');

    // Apply filters
    if (branchId) {
      queryBuilder.andWhere('table.branchId = :branchId', { branchId });
    }

    if (status) {
      queryBuilder.andWhere('table.status = :status', { status });
    }

    if (areaId) {
      queryBuilder.andWhere('table.areaId = :areaId', { areaId });
    }

    if (isVIP !== undefined) {
      const isVIPBool = isVIP === 'true' || isVIP === true;
      queryBuilder.andWhere('table.isVIP = :isVIP', { isVIP: isVIPBool });
    }

    if (isActive !== undefined) {
      const isActiveBool = isActive === 'true' || isActive === true;
      queryBuilder.andWhere('table.isActive = :isActive', {
        isActive: isActiveBool,
      });
    }

    // Count total items for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Order by table number
    queryBuilder.orderBy('table.tableNumber', 'ASC');

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id },
      relations: ['area'],
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }

    return table;
  }

  async update(id: number, updateTableDto: UpdateTableDto): Promise<Table> {
    const table = await this.findOne(id);

    // Update the table properties
    Object.assign(table, updateTableDto);

    return this.tableRepository.save(table);
  }

  async remove(id: number): Promise<void> {
    const result = await this.tableRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }
  }

  async findByArea(areaId: number): Promise<Table[]> {
    return this.tableRepository.find({
      where: { areaId, isActive: true },
      order: { tableNumber: 'ASC' },
    });
  }
}
