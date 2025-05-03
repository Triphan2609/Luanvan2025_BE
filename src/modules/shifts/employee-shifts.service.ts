import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  EmployeeShift,
  ScheduleStatus,
} from './entities/employee-shift.entity';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { UpdateEmployeeShiftDto } from './dto/update-employee-shift.dto';

// Error interface for PostgreSQL errors
interface PostgresError extends Error {
  code: string;
}

@Injectable()
export class EmployeeShiftsService {
  constructor(
    @InjectRepository(EmployeeShift)
    private readonly employeeShiftRepository: Repository<EmployeeShift>,
  ) {}

  async create(
    createEmployeeShiftDto: CreateEmployeeShiftDto,
  ): Promise<EmployeeShift> {
    try {
      // Tự động tạo schedule_code nếu không được cung cấp
      if (!createEmployeeShiftDto.schedule_code) {
        // Thêm employee_id và timestamp để đảm bảo mã không trùng lặp
        const randomSuffix = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0');
        createEmployeeShiftDto.schedule_code = `LS${createEmployeeShiftDto.employee_id}-${randomSuffix}`;
      }

      // Đặt trạng thái mặc định là PENDING nếu không được cung cấp
      if (!createEmployeeShiftDto.status) {
        createEmployeeShiftDto.status = ScheduleStatus.PENDING;
      }

      const employeeShift = this.employeeShiftRepository.create(
        createEmployeeShiftDto,
      );
      return this.employeeShiftRepository.save(employeeShift);
    } catch (error) {
      // Xử lý lỗi trùng lặp schedule_code
      const pgError = error as PostgresError;
      const mysqlError = error as { code?: string };
      if (pgError.code === '23505' || mysqlError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('Mã lịch làm việc đã tồn tại');
      }
      throw error;
    }
  }

  async findAll(filter?: {
    employeeId?: number;
    shiftId?: number;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: ScheduleStatus;
    department_id?: number;
  }): Promise<EmployeeShift[]> {
    const query = this.employeeShiftRepository
      .createQueryBuilder('employeeShift')
      .leftJoinAndSelect('employeeShift.employee', 'employee')
      .leftJoinAndSelect('employeeShift.shift', 'shift')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.role', 'role');

    if (filter?.employeeId) {
      query.andWhere('employeeShift.employee_id = :employeeId', {
        employeeId: filter.employeeId,
      });
    }

    if (filter?.shiftId) {
      query.andWhere('employeeShift.shift_id = :shiftId', {
        shiftId: filter.shiftId,
      });
    }

    if (filter?.date) {
      query.andWhere('employeeShift.date = :date', { date: filter.date });
    }

    if (filter?.startDate && filter?.endDate) {
      query.andWhere('employeeShift.date BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    } else if (filter?.startDate) {
      query.andWhere('employeeShift.date >= :startDate', {
        startDate: filter.startDate,
      });
    } else if (filter?.endDate) {
      query.andWhere('employeeShift.date <= :endDate', {
        endDate: filter.endDate,
      });
    }

    if (filter?.status) {
      query.andWhere('employeeShift.status = :status', {
        status: filter.status,
      });
    }

    if (filter?.department_id) {
      query.andWhere('employee.department_id = :departmentId', {
        departmentId: filter.department_id,
      });
    }

    // Sắp xếp theo ngày và ID ca
    query
      .orderBy('employeeShift.date', 'DESC')
      .addOrderBy('shift.start_time', 'ASC')
      .addOrderBy('employeeShift.id', 'DESC');

    return query.getMany();
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<EmployeeShift[]> {
    return this.employeeShiftRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
      relations: ['employee', 'employee.department', 'employee.role', 'shift'],
      order: {
        date: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<EmployeeShift> {
    const employeeShift = await this.employeeShiftRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.department', 'employee.role', 'shift'],
    });
    if (!employeeShift) {
      throw new NotFoundException('Lịch làm việc không tồn tại');
    }
    return employeeShift;
  }

  async findByCode(code: string): Promise<EmployeeShift> {
    const employeeShift = await this.employeeShiftRepository.findOne({
      where: { schedule_code: code },
      relations: ['employee', 'employee.department', 'employee.role', 'shift'],
    });
    if (!employeeShift) {
      throw new NotFoundException('Lịch làm việc không tồn tại');
    }
    return employeeShift;
  }

  async update(
    id: number,
    updateEmployeeShiftDto: UpdateEmployeeShiftDto,
  ): Promise<EmployeeShift> {
    const employeeShift = await this.employeeShiftRepository.preload({
      id,
      ...updateEmployeeShiftDto,
    });
    if (!employeeShift) {
      throw new NotFoundException('Lịch làm việc không tồn tại');
    }
    return this.employeeShiftRepository.save(employeeShift);
  }

  async updateStatus(
    id: number,
    status: ScheduleStatus,
  ): Promise<EmployeeShift> {
    const employeeShift = await this.findOne(id);
    employeeShift.status = status;
    return this.employeeShiftRepository.save(employeeShift);
  }

  async remove(id: number): Promise<void> {
    const result = await this.employeeShiftRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Lịch làm việc không tồn tại');
    }
  }

  async bulkCreate(dtos: CreateEmployeeShiftDto[]): Promise<EmployeeShift[]> {
    // Tự động tạo schedule_code cho mỗi dto
    const entities = dtos.map((dto) => {
      if (!dto.schedule_code) {
        // Thêm employee_id và số ngẫu nhiên để đảm bảo mã không trùng lặp
        const randomSuffix = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0');
        dto.schedule_code = `LS${dto.employee_id}-${randomSuffix}`;
      }
      if (!dto.status) {
        dto.status = ScheduleStatus.PENDING;
      }
      return this.employeeShiftRepository.create(dto);
    });

    return this.employeeShiftRepository.save(entities);
  }

  async bulkUpdateStatus(
    ids: number[],
    status: ScheduleStatus,
  ): Promise<{ updated: number }> {
    const result = await this.employeeShiftRepository.update(
      { id: In(ids) },
      { status },
    );
    return { updated: result.affected || 0 };
  }

  async bulkDelete(ids: number[]): Promise<{ deleted: number }> {
    const result = await this.employeeShiftRepository.delete({ id: In(ids) });
    return { deleted: result.affected || 0 };
  }
}
