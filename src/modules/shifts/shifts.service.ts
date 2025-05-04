import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift, ShiftType } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { EmployeeShiftsService } from './employee-shifts.service';

// Error interface for PostgreSQL errors
interface PostgresError extends Error {
  code: string;
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    private readonly employeeShiftsService: EmployeeShiftsService, // Inject EmployeeShiftsService
  ) {}

  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    try {
      // Tự động tạo shift_code nếu không được cung cấp
      if (!createShiftDto.shift_code) {
        const countShifts = await this.shiftRepository.count();
        createShiftDto.shift_code = `CA${String(countShifts + 1).padStart(3, '0')}`;
      }

      const shift = this.shiftRepository.create(createShiftDto);
      return this.shiftRepository.save(shift);
    } catch (error) {
      if ((error as PostgresError).code === '23505') {
        // PostgreSQL unique constraint violation
        throw new BadRequestException('Mã ca làm việc đã tồn tại');
      }
      throw error;
    }
  }

  async findAll(options?: {
    type?: ShiftType;
    isActive?: boolean;
    branch_id?: number;
  }): Promise<Shift[]> {
    const query = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.branch', 'branch');

    if (options?.type) {
      query.andWhere('shift.type = :type', { type: options.type });
    }

    if (options?.isActive !== undefined) {
      query.andWhere('shift.is_active = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.branch_id) {
      query.andWhere('shift.branch_id = :branchId', {
        branchId: options.branch_id,
      });
    }

    return query.getMany();
  }

  async findByBranch(branchId: number): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { branch_id: branchId },
      relations: ['branch'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!shift) {
      throw new NotFoundException('Ca làm việc không tồn tại');
    }
    return shift;
  }

  async findByCode(code: string): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { shift_code: code },
      relations: ['branch'],
    });
    if (!shift) {
      throw new NotFoundException('Ca làm việc không tồn tại');
    }
    return shift;
  }

  async update(id: number, updateShiftDto: UpdateShiftDto): Promise<Shift> {
    try {
      const shift = await this.shiftRepository.preload({
        id,
        ...updateShiftDto,
      });

      if (!shift) {
        throw new NotFoundException('Ca làm việc không tồn tại');
      }

      return this.shiftRepository.save(shift);
    } catch (error) {
      if ((error as PostgresError).code === '23505') {
        // PostgreSQL unique constraint violation
        throw new BadRequestException('Mã ca làm việc đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const result = await this.shiftRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Ca làm việc không tồn tại');
    }
  }

  async deactivate(id: number): Promise<Shift> {
    const shift = await this.findOne(id);
    shift.is_active = false;
    return this.shiftRepository.save(shift);
  }

  async activate(id: number): Promise<Shift> {
    const shift = await this.findOne(id);
    shift.is_active = true;
    return this.shiftRepository.save(shift);
  }

  // Ví dụ: Sử dụng EmployeeShiftsService
  async findShiftsWithEmployees() {
    return this.employeeShiftsService.findAll();
  }
}
