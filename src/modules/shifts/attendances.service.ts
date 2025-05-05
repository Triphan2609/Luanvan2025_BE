import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

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
    let employeeShift: EmployeeShift | null = null;
    if (createAttendanceDto.employee_shift_id) {
      employeeShift = await this.employeeShiftRepository.findOne({
        where: { id: createAttendanceDto.employee_shift_id },
        relations: ['shift'],
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
      if (employeeShift && employeeShift.shift) {
        // Nếu có thông tin ca làm việc, sử dụng thông tin này để tính giờ làm việc
        const isNightShift =
          createAttendanceDto.type === AttendanceType.NIGHT_SHIFT ||
          employeeShift.shift.end_time === '00:00:00' ||
          employeeShift.shift.start_time === '00:00:00' ||
          employeeShift.shift.start_time > employeeShift.shift.end_time;

        attendance.working_hours = this.calculateWorkingHoursWithShift(
          check_in,
          check_out,
          employeeShift.shift.start_time,
          employeeShift.shift.end_time,
          isNightShift,
        );
      } else {
        // Nếu không có thông tin ca làm việc, sử dụng cách tính thông thường
        attendance.working_hours = this.calculateWorkingHours(
          check_in,
          check_out,
        );
      }

      // Phân loại và tính toán giờ theo loại
      if (createAttendanceDto.type === AttendanceType.OVERTIME) {
        attendance.overtime_hours = attendance.working_hours;
      } else if (createAttendanceDto.type === AttendanceType.NIGHT_SHIFT) {
        // Đảm bảo giờ ca đêm được gán chính xác
        attendance.night_shift_hours = attendance.working_hours;
        // Đảm bảo giờ ca đêm không bị ghi đè khi lưu
        attendance.overtime_hours = 0;
        attendance.holiday_hours = 0;
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
    // Create a query builder instead of using complex FindOptionsWhere with spread operators
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.role', 'role')
      .leftJoinAndSelect('employee.branch', 'branch')
      .leftJoinAndSelect('attendance.employeeShift', 'employeeShift')
      .leftJoinAndSelect('employeeShift.shift', 'shift');

    // Apply filters
    if (queryDto.employee_id) {
      query.andWhere('attendance.employee_id = :employeeId', {
        employeeId: queryDto.employee_id,
      });
    }

    if (queryDto.department_id) {
      query.andWhere('employee.department_id = :departmentId', {
        departmentId: queryDto.department_id,
      });
    }

    if (queryDto.branch_id) {
      query.andWhere('employee.branch_id = :branchId', {
        branchId: queryDto.branch_id,
      });
    }

    if (queryDto.start_date && queryDto.end_date) {
      query.andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate: new Date(queryDto.start_date),
        endDate: new Date(queryDto.end_date),
      });
    }

    if (queryDto.type) {
      query.andWhere('attendance.type = :type', { type: queryDto.type });
    }

    if (queryDto.status) {
      query.andWhere('attendance.status = :status', {
        status: queryDto.status,
      });
    }

    if (queryDto.search) {
      query.andWhere('employee.name LIKE :search', {
        search: `%${queryDto.search}%`,
      });
    }

    // Add ordering
    query
      .orderBy('attendance.date', 'DESC')
      .addOrderBy('attendance.created_at', 'DESC');

    return query.getMany();
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
    Object.assign(attendance, updateStatusDto);
    return this.attendanceRepository.save(attendance);
  }

  async update(
    id: number,
    updateAttendanceDto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    const attendance = await this.findOne(id);

    // Xử lý cập nhật thông tin chấm công
    if (updateAttendanceDto.employee_shift_id) {
      const employeeShift = await this.employeeShiftRepository.findOne({
        where: { id: updateAttendanceDto.employee_shift_id },
        relations: ['shift'],
      });

      if (!employeeShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID ${updateAttendanceDto.employee_shift_id}`,
        );
      }

      attendance.employeeShift = employeeShift;
    }

    // Cập nhật các trường thông tin
    if (updateAttendanceDto.check_in) {
      attendance.check_in = updateAttendanceDto.check_in;
    }

    if (updateAttendanceDto.check_out) {
      attendance.check_out = updateAttendanceDto.check_out;
    }

    if (updateAttendanceDto.type) {
      attendance.type = updateAttendanceDto.type;
    }

    if (updateAttendanceDto.notes !== undefined) {
      attendance.notes = updateAttendanceDto.notes;
    }

    // Tính toán lại giờ làm việc nếu có cả check-in và check-out
    if (attendance.check_in && attendance.check_out) {
      if (attendance.employeeShift && attendance.employeeShift.shift) {
        const isNightShift =
          attendance.type === AttendanceType.NIGHT_SHIFT ||
          attendance.employeeShift.shift.end_time === '00:00:00' ||
          attendance.employeeShift.shift.start_time === '00:00:00' ||
          attendance.employeeShift.shift.start_time >
            attendance.employeeShift.shift.end_time;

        attendance.working_hours = this.calculateWorkingHoursWithShift(
          attendance.check_in,
          attendance.check_out,
          attendance.employeeShift.shift.start_time,
          attendance.employeeShift.shift.end_time,
          isNightShift,
        );
      } else {
        attendance.working_hours = this.calculateWorkingHours(
          attendance.check_in,
          attendance.check_out,
        );
      }

      // Cập nhật phân loại giờ theo loại chấm công
      if (attendance.type === AttendanceType.OVERTIME) {
        attendance.overtime_hours = attendance.working_hours;
        attendance.night_shift_hours = 0;
        attendance.holiday_hours = 0;
      } else if (attendance.type === AttendanceType.NIGHT_SHIFT) {
        attendance.night_shift_hours = attendance.working_hours;
        attendance.overtime_hours = 0;
        attendance.holiday_hours = 0;
      } else if (attendance.type === AttendanceType.HOLIDAY) {
        attendance.holiday_hours = attendance.working_hours;
        attendance.overtime_hours = 0;
        attendance.night_shift_hours = 0;
      } else {
        // AttendanceType.NORMAL
        attendance.overtime_hours = 0;
        attendance.night_shift_hours = 0;
        attendance.holiday_hours = 0;
      }
    }

    // Cho phép ghi đè các giá trị giờ làm việc nếu được chỉ định
    if (updateAttendanceDto.working_hours !== undefined) {
      attendance.working_hours = updateAttendanceDto.working_hours;
    }

    if (updateAttendanceDto.overtime_hours !== undefined) {
      attendance.overtime_hours = updateAttendanceDto.overtime_hours;
    }

    if (updateAttendanceDto.night_shift_hours !== undefined) {
      attendance.night_shift_hours = updateAttendanceDto.night_shift_hours;
    }

    if (updateAttendanceDto.holiday_hours !== undefined) {
      attendance.holiday_hours = updateAttendanceDto.holiday_hours;
    }

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
    branchId?: number,
  ): Promise<{
    totalAttendances: number;
    totalEmployees: number;
    totalWorkingHours: number;
    avgWorkingHoursPerDay: number;
    byType: Record<AttendanceType, number>;
    byStatus: Record<AttendanceStatus, number>;
    byDepartment: Record<string, { count: number; hours: number }>;
    byBranch?: Record<string, { count: number; hours: number }>;
  }> {
    // Use query builder instead of complex where conditions
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.branch', 'branch')
      .where('attendance.date BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

    if (departmentId) {
      query.andWhere('employee.department_id = :departmentId', {
        departmentId,
      });
    }

    if (branchId) {
      query.andWhere('employee.branch_id = :branchId', {
        branchId,
      });
    }

    const attendances = await query.getMany();

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

    // Group by branch
    const byBranch = attendances.reduce(
      (acc, a) => {
        const branchName =
          a.employee && a.employee.branch ? a.employee.branch.name : 'Unknown';
        if (!acc[branchName]) {
          acc[branchName] = { count: 0, hours: 0 };
        }
        acc[branchName].count += 1;
        acc[branchName].hours += a.working_hours;
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
      byBranch,
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

  // Hàm tính toán giờ làm việc với thông tin ca
  private calculateWorkingHoursWithShift(
    checkIn: string,
    checkOut: string,
    shiftStart: string,
    shiftEnd: string,
    isNightShift: boolean,
  ): number {
    const [checkInHour, checkInMinute] = checkIn.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = checkOut.split(':').map(Number);
    const [shiftStartHour, shiftStartMinute] = shiftStart
      .split(':')
      .map(Number);
    const [shiftEndHour, shiftEndMinute] = shiftEnd.split(':').map(Number);

    const checkInTime = checkInHour + checkInMinute / 60;
    const checkOutTime = checkOutHour + checkOutMinute / 60;
    const shiftStartTime = shiftStartHour + shiftStartMinute / 60;
    const shiftEndTime = shiftEndHour + shiftEndMinute / 60;

    let workingHours = 0;

    // Xử lý đặc biệt cho ca tối/đêm (ca qua nửa đêm)
    if (isNightShift) {
      // Ca đêm hoặc ca tối kết thúc vào nửa đêm hoặc sau nửa đêm
      if (shiftEndTime === 0 || shiftStartTime > shiftEndTime) {
        // Trường hợp ca kết thúc vào nửa đêm (00:00) hoặc sau nửa đêm
        const totalShiftHours =
          shiftEndTime === 0
            ? 24 - shiftStartTime
            : 24 - shiftStartTime + shiftEndTime;

        // Trường hợp checkout sớm hơn end_time
        if (
          checkOutTime < shiftEndTime ||
          (shiftEndTime === 0 &&
            checkOutTime < 24 &&
            checkOutTime >= shiftStartTime)
        ) {
          // Checkout sớm trong cùng ngày
          workingHours = checkOutTime - checkInTime;
        } else if (
          checkOutTime > 0 &&
          checkOutTime <= shiftEndTime &&
          shiftEndTime > 0
        ) {
          // Checkout vào ngày hôm sau nhưng trước khi kết thúc ca
          workingHours = 24 - checkInTime + checkOutTime;
        } else {
          // Checkout đúng giờ hoặc muộn hơn
          workingHours = totalShiftHours;
        }
      } else {
        // Ca đêm thông thường
        workingHours = checkOutTime - checkInTime;
        if (workingHours < 0) {
          workingHours += 24;
        }
      }
    } else {
      // Ca bình thường
      workingHours = checkOutTime - checkInTime;
      if (workingHours < 0) {
        workingHours += 24;
      }
    }

    // Làm tròn đến 0.5 giờ
    return Math.round(workingHours * 2) / 2;
  }
}
