import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindOptionsWhere } from 'typeorm';
import {
  Attendance,
  AttendanceStatus,
  AttendanceType,
} from './entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { EmployeeShift } from './entities/employee-shift.entity';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(EmployeeShift)
    private employeeShiftRepository: Repository<EmployeeShift>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    const { employee_id, date, check_in, check_out } = createAttendanceDto;

    // Tìm nhân viên
    const employee = await this.employeeRepository.findOne({
      where: { id: employee_id },
    });

    if (!employee) {
      throw new NotFoundException(
        `Không tìm thấy nhân viên với ID ${employee_id}`,
      );
    }

    // Nếu có employee_shift_id, kiểm tra ca làm việc
    if (createAttendanceDto.employee_shift_id) {
      const employeeShift = await this.employeeShiftRepository.findOne({
        where: { id: createAttendanceDto.employee_shift_id },
      });

      if (!employeeShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID ${createAttendanceDto.employee_shift_id}`,
        );
      }
    }

    // Tạo dữ liệu chấm công
    const attendance = this.attendanceRepository.create(createAttendanceDto);

    // Tính toán số giờ làm việc nếu có check-in và check-out
    if (check_in && check_out) {
      // Hàm tính toán giờ làm việc
      attendance.working_hours = this.calculateWorkingHours(
        check_in,
        check_out,
      );

      // Phân loại và tính toán giờ theo loại
      if (createAttendanceDto.type === AttendanceType.OVERTIME) {
        attendance.overtime_hours = attendance.working_hours;
      } else if (createAttendanceDto.type === AttendanceType.NIGHT_SHIFT) {
        attendance.night_shift_hours = attendance.working_hours;
      } else if (createAttendanceDto.type === AttendanceType.HOLIDAY) {
        attendance.holiday_hours = attendance.working_hours;
      }
    }

    // Xử lý nếu là điều chỉnh
    if (createAttendanceDto.is_adjustment) {
      attendance.is_adjustment = true;

      // Nếu người dùng đã nhập giờ làm việc
      if (createAttendanceDto.working_hours !== undefined) {
        attendance.working_hours = createAttendanceDto.working_hours;
      }

      // Nếu người dùng đã nhập giờ làm thêm
      if (createAttendanceDto.overtime_hours !== undefined) {
        attendance.overtime_hours = createAttendanceDto.overtime_hours;
      }

      // Nếu người dùng đã nhập giờ ca đêm
      if (createAttendanceDto.night_shift_hours !== undefined) {
        attendance.night_shift_hours = createAttendanceDto.night_shift_hours;
      }

      // Nếu người dùng đã nhập giờ ngày lễ
      if (createAttendanceDto.holiday_hours !== undefined) {
        attendance.holiday_hours = createAttendanceDto.holiday_hours;
      }
    }

    try {
      return await this.attendanceRepository.save(attendance);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(
          `Dữ liệu chấm công cho nhân viên ${employee_id} vào ngày ${date} đã tồn tại`,
        );
      }
      throw error;
    }
  }

  async findAll(queryDto: QueryAttendanceDto): Promise<Attendance[]> {
    const where: FindOptionsWhere<Attendance> = {};

    // Apply filters
    if (queryDto.employee_id) {
      where.employee_id = queryDto.employee_id;
    }

    if (queryDto.department_id) {
      where.employee = { department: { id: queryDto.department_id } };
    }

    if (queryDto.start_date && queryDto.end_date) {
      where.date = Between(
        new Date(queryDto.start_date),
        new Date(queryDto.end_date),
      );
    }

    if (queryDto.type) {
      where.type = queryDto.type;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.search) {
      where.employee = { name: Like(`%${queryDto.search}%`) };
    }

    return this.attendanceRepository.find({
      where,
      relations: [
        'employee',
        'employee.department',
        'employee.role',
        'employeeShift',
        'employeeShift.shift',
      ],
      order: { date: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: [
        'employee',
        'employee.department',
        'employee.role',
        'employeeShift',
        'employeeShift.shift',
      ],
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return attendance;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateAttendanceStatusDto,
  ): Promise<Attendance> {
    const attendance = await this.findOne(id);

    this.attendanceRepository.merge(attendance, updateStatusDto);

    return this.attendanceRepository.save(attendance);
  }

  async remove(id: number): Promise<void> {
    const attendance = await this.findOne(id);
    await this.attendanceRepository.remove(attendance);
  }

  async updateCheckOut(id: number, checkOut: string): Promise<Attendance> {
    const attendance = await this.findOne(id);

    if (!attendance.check_in) {
      throw new BadRequestException('Cannot set check-out before check-in');
    }

    const checkIn = new Date(`2000-01-01T${attendance.check_in}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);

    // Calculate working hours
    const workingHours =
      (checkOutTime.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

    // Ensure positive working hours
    if (workingHours < 0) {
      throw new BadRequestException(
        'Check-out time must be after check-in time',
      );
    }

    attendance.check_out = checkOut;
    attendance.working_hours = workingHours;

    return this.attendanceRepository.save(attendance);
  }

  async getAttendanceStats(
    startDate: string,
    endDate: string,
    departmentId?: number,
  ): Promise<{
    totalAttendances: number;
    totalEmployees: number;
    totalWorkingHours: number;
    avgWorkingHoursPerDay: number;
    byType: Record<AttendanceType, number>;
    byStatus: Record<AttendanceStatus, number>;
    byDepartment: Record<string, { count: number; hours: number }>;
  }> {
    // Build query options
    const whereCondition: FindOptionsWhere<Attendance> = {
      date: Between(new Date(startDate), new Date(endDate)),
    };

    if (departmentId) {
      whereCondition.employee = {
        department: { id: departmentId },
      } as { department: { id: number } };
    }

    const attendances = await this.attendanceRepository.find({
      where: whereCondition,
      relations: ['employee', 'employee.department'],
    });

    // Calculate stats
    const totalAttendances = attendances.length;
    const totalEmployees = new Set(attendances.map((a) => a.employee_id)).size;
    const totalWorkingHours = attendances.reduce(
      (sum, a) => sum + a.working_hours,
      0,
    );
    const avgWorkingHoursPerDay = totalWorkingHours / (totalAttendances || 1);

    // Group by type
    const byType = attendances.reduce(
      (acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      },
      {} as Record<AttendanceType, number>,
    );

    // Group by status
    const byStatus = attendances.reduce(
      (acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      },
      {} as Record<AttendanceStatus, number>,
    );

    // Group by department
    const byDepartment = attendances.reduce(
      (acc, a) => {
        const deptName =
          a.employee && a.employee.department
            ? a.employee.department.name
            : 'Unknown';
        if (!acc[deptName]) {
          acc[deptName] = { count: 0, hours: 0 };
        }
        acc[deptName].count += 1;
        acc[deptName].hours += a.working_hours;
        return acc;
      },
      {} as Record<string, { count: number; hours: number }>,
    );

    return {
      totalAttendances,
      totalEmployees,
      totalWorkingHours,
      avgWorkingHoursPerDay,
      byType,
      byStatus,
      byDepartment,
    };
  }

  // Hàm tính toán giờ làm việc
  private calculateWorkingHours(checkIn: string, checkOut: string): number {
    const [checkInHour, checkInMinute] = checkIn.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = checkOut.split(':').map(Number);

    const checkInTime = checkInHour + checkInMinute / 60;
    const checkOutTime = checkOutHour + checkOutMinute / 60;

    // Xử lý trường hợp checkout vào ngày hôm sau
    let workingHours = checkOutTime - checkInTime;
    if (workingHours < 0) {
      workingHours += 24; // Thêm 24 giờ nếu checkout vào ngày hôm sau
    }

    // Làm tròn đến 0.5 giờ
    return Math.round(workingHours * 2) / 2;
  }
}
