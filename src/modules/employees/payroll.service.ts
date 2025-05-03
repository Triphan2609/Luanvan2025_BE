import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindOptionsWhere } from 'typeorm';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { Employee } from './entities/employee.entity';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { SalaryConfigService } from './salary-config.service';
import { SalaryConfig, SalaryType } from './entities/salary-config.entity';
import {
  Attendance,
  AttendanceStatus,
} from '../shifts/entities/attendance.entity';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectRepository(Payroll)
    private payrollRepository: Repository<Payroll>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private salaryConfigService: SalaryConfigService,
  ) {}

  private generatePayrollCode(employeeCode: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Đếm số bảng lương đã tạo trong tháng
    return this.payrollRepository
      .count({
        where: {
          created_at: Between(
            new Date(`${year}-${month}-01`),
            new Date(
              new Date(`${year}-${month}-01`).setMonth(today.getMonth() + 1) -
                1,
            ),
          ),
        },
      })
      .then((countThisMonth) => {
        // Tạo mã với định dạng: TL-yyyyMM-nnn-empCode
        return `TL-${year}${month}-${String(countThisMonth + 1).padStart(3, '0')}-${employeeCode}`;
      });
  }

  private calculateSalaryByType(
    salaryConfig: SalaryConfig,
    attendances: Attendance[],
    periodDays: number,
    createPayrollDto: CreatePayrollDto,
  ): {
    normalSalary: number;
    overtimePay: number;
    nightShiftPay: number;
    holidayPay: number;
    totalWorkingHours: number;
    overtimeHours: number;
    nightShiftHours: number;
    holidayHours: number;
    totalShifts: number;
  } {
    // Tính tổng số giờ làm việc và các loại giờ
    const totalWorkingHours = attendances.reduce(
      (sum, att) => sum + (att.working_hours || 0),
      0,
    );
    const overtimeHours = attendances.reduce(
      (sum, att) => sum + (att.overtime_hours || 0),
      0,
    );
    const nightShiftHours = attendances.reduce(
      (sum, att) => sum + (att.night_shift_hours || 0),
      0,
    );
    const holidayHours = attendances.reduce(
      (sum, att) => sum + (att.holiday_hours || 0),
      0,
    );

    // Tính tổng số ca làm việc (giả sử mỗi ca 8 giờ)
    const totalShifts = Math.ceil(
      totalWorkingHours / (salaryConfig.standard_hours_per_day || 8),
    );

    // Mức lương cơ bản
    const baseSalary = createPayrollDto.base_salary || salaryConfig.base_salary;
    let normalSalary = 0;
    let overtimePay = 0;
    let nightShiftPay = 0;
    let holidayPay = 0;

    // Tính lương theo loại
    switch (salaryConfig.salary_type) {
      case SalaryType.MONTHLY: {
        // Lương tháng
        const workingDays = attendances.length;
        const standardDaysInMonth = salaryConfig.standard_days_per_month || 22;

        // Lương ngày công bình thường
        normalSalary = (baseSalary / standardDaysInMonth) * workingDays;

        // Lương tăng ca, ca đêm, ngày lễ
        const hourlyRate =
          baseSalary /
          (standardDaysInMonth * (salaryConfig.standard_hours_per_day || 8));
        overtimePay =
          overtimeHours * hourlyRate * salaryConfig.overtime_multiplier;
        nightShiftPay =
          nightShiftHours * hourlyRate * salaryConfig.night_shift_multiplier;
        holidayPay =
          holidayHours * hourlyRate * salaryConfig.holiday_multiplier;
        break;
      }

      case SalaryType.HOURLY: {
        // Lương giờ
        const hourlyRate = salaryConfig.hourly_rate || 0;

        // Lương bình thường
        normalSalary =
          (totalWorkingHours - overtimeHours - nightShiftHours - holidayHours) *
          hourlyRate;

        // Lương tăng ca, ca đêm, ngày lễ
        overtimePay =
          overtimeHours * hourlyRate * salaryConfig.overtime_multiplier;
        nightShiftPay =
          nightShiftHours * hourlyRate * salaryConfig.night_shift_multiplier;
        holidayPay =
          holidayHours * hourlyRate * salaryConfig.holiday_multiplier;
        break;
      }

      case SalaryType.SHIFT: {
        // Lương theo ca
        const shiftRate = salaryConfig.shift_rate || 0;

        // Lương bình thường
        normalSalary = totalShifts * shiftRate;

        // Lương tăng ca, ca đêm, ngày lễ (tính theo giờ)
        const hourlyShiftRate =
          shiftRate / (salaryConfig.standard_hours_per_day || 8);
        overtimePay =
          overtimeHours * hourlyShiftRate * salaryConfig.overtime_multiplier;
        nightShiftPay =
          nightShiftHours *
          hourlyShiftRate *
          salaryConfig.night_shift_multiplier;
        holidayPay =
          holidayHours * hourlyShiftRate * salaryConfig.holiday_multiplier;
        break;
      }

      default:
        throw new BadRequestException(
          `Không hỗ trợ loại lương: ${String(salaryConfig.salary_type)}`,
        );
    }

    return {
      normalSalary,
      overtimePay,
      nightShiftPay,
      holidayPay,
      totalWorkingHours,
      overtimeHours,
      nightShiftHours,
      holidayHours,
      totalShifts,
    };
  }

  async create(createPayrollDto: CreatePayrollDto): Promise<Payroll> {
    const { employee_id, period_start, period_end, period_type } =
      createPayrollDto;

    // Kiểm tra nhân viên
    const employee = await this.employeeRepository.findOne({
      where: { id: employee_id },
      relations: ['department', 'role'],
    });

    if (!employee) {
      throw new NotFoundException(
        `Không tìm thấy nhân viên với ID ${employee_id}`,
      );
    }

    // Lấy cấu hình lương của nhân viên
    let salaryConfig: SalaryConfig;
    if (createPayrollDto.salary_config_id) {
      const config = await this.salaryConfigService.findOne(
        createPayrollDto.salary_config_id,
      );
      if (!config) {
        throw new NotFoundException(
          `Không tìm thấy cấu hình lương với ID ${createPayrollDto.salary_config_id}`,
        );
      }
      salaryConfig = config;
    } else {
      try {
        salaryConfig =
          await this.salaryConfigService.getEmployeeSalaryConfig(employee_id);
      } catch (error) {
        throw new BadRequestException(
          `Không thể lấy cấu hình lương cho nhân viên: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Kiểm tra không cho phép tạo bảng lương trùng kỳ
    const existingPayroll = await this.payrollRepository.findOne({
      where: {
        employee_id,
        period_start: new Date(period_start),
        period_end: new Date(period_end),
      },
    });

    if (existingPayroll) {
      throw new ConflictException(
        `Đã tồn tại bảng lương cho nhân viên ${employee_id} trong kỳ này`,
      );
    }

    // Tính số ngày trong kỳ lương
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    const daysInPeriod =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    // Lấy dữ liệu chấm công trong kỳ
    const attendances = await this.attendanceRepository.find({
      where: {
        employee_id,
        date: Between(new Date(period_start), new Date(period_end)),
        status: AttendanceStatus.APPROVED,
      },
    });

    // Tính lương theo loại lương
    const salaryCalculation = this.calculateSalaryByType(
      salaryConfig,
      attendances,
      daysInPeriod,
      createPayrollDto,
    );

    // Phụ cấp
    const mealAllowance =
      createPayrollDto.allowances?.meal_allowance ??
      salaryConfig.meal_allowance ??
      0;
    const transportAllowance =
      createPayrollDto.allowances?.transport_allowance ??
      salaryConfig.transport_allowance ??
      0;
    const housingAllowance =
      createPayrollDto.allowances?.housing_allowance ??
      salaryConfig.housing_allowance ??
      0;
    const positionAllowance =
      createPayrollDto.allowances?.position_allowance ??
      salaryConfig.position_allowance ??
      0;
    const attendanceBonus =
      createPayrollDto.allowances?.attendance_bonus ??
      salaryConfig.attendance_bonus ??
      0;
    const performanceBonus =
      createPayrollDto.allowances?.performance_bonus ?? 0;

    // Tổng phụ cấp
    const totalAllowances =
      mealAllowance +
      transportAllowance +
      housingAllowance +
      positionAllowance +
      attendanceBonus +
      performanceBonus;

    // Tổng lương gộp
    const grossPay =
      salaryCalculation.normalSalary +
      salaryCalculation.overtimePay +
      salaryCalculation.nightShiftPay +
      salaryCalculation.holidayPay +
      totalAllowances;

    // Các khoản khấu trừ
    const taxRate =
      createPayrollDto.deductions?.tax !== undefined
        ? createPayrollDto.deductions.tax / grossPay
        : salaryConfig.tax_rate;
    const insuranceRate =
      createPayrollDto.deductions?.insurance !== undefined
        ? createPayrollDto.deductions.insurance / grossPay
        : salaryConfig.insurance_rate;
    const otherDeductions = createPayrollDto.deductions?.other_deductions ?? 0;

    // Tính thuế và bảo hiểm
    const tax = grossPay * taxRate;
    const insurance = grossPay * insuranceRate;

    // Tổng khấu trừ
    const totalDeductions = tax + insurance + otherDeductions;

    // Lương thực lãnh
    const netPay = grossPay - totalDeductions;

    // Tạo mã bảng lương
    const payrollCode = await this.generatePayrollCode(employee.employee_code);

    // Tạo bảng lương
    const payroll = this.payrollRepository.create({
      payroll_code: payrollCode,
      employee_id,
      salary_config_id: salaryConfig.id,
      salary_type: salaryConfig.salary_type,
      period_start: new Date(period_start),
      period_end: new Date(period_end),
      period_type,
      base_salary: createPayrollDto.base_salary || salaryConfig.base_salary,
      hourly_rate: salaryConfig.hourly_rate,
      shift_rate: salaryConfig.shift_rate,
      total_working_hours: salaryCalculation.totalWorkingHours,
      working_days: attendances.length,
      overtime_hours: salaryCalculation.overtimeHours,
      night_shift_hours: salaryCalculation.nightShiftHours,
      holiday_hours: salaryCalculation.holidayHours,
      total_shifts: salaryCalculation.totalShifts,
      overtime_multiplier: salaryConfig.overtime_multiplier,
      night_shift_multiplier: salaryConfig.night_shift_multiplier,
      holiday_multiplier: salaryConfig.holiday_multiplier,
      normal_salary: salaryCalculation.normalSalary,
      overtime_pay: salaryCalculation.overtimePay,
      night_shift_pay: salaryCalculation.nightShiftPay,
      holiday_pay: salaryCalculation.holidayPay,
      meal_allowance: mealAllowance,
      transport_allowance: transportAllowance,
      housing_allowance: housingAllowance,
      position_allowance: positionAllowance,
      attendance_bonus: attendanceBonus,
      performance_bonus: performanceBonus,
      allowances: totalAllowances,
      tax_rate: taxRate,
      tax,
      insurance_rate: insuranceRate,
      insurance,
      other_deductions: otherDeductions,
      deductions: totalDeductions,
      gross_pay: grossPay,
      net_pay: netPay,
      status: createPayrollDto.status || PayrollStatus.DRAFT,
      created_by: createPayrollDto.created_by,
      notes: createPayrollDto.notes,
      attendance_data: JSON.stringify(attendances),
    });

    return this.payrollRepository.save(payroll);
  }

  async findAll(queryDto: QueryPayrollDto): Promise<Payroll[]> {
    const where: FindOptionsWhere<Payroll> = {};

    // Apply filters
    if (queryDto.employee_id) {
      where.employee_id = queryDto.employee_id;
    }

    if (queryDto.department_id) {
      where.employee = { department: { id: queryDto.department_id } };
    }

    if (queryDto.start_date && queryDto.end_date) {
      where.period_start = Between(
        new Date(queryDto.start_date),
        new Date(queryDto.end_date),
      );
    }

    if (queryDto.period_type) {
      where.period_type = queryDto.period_type;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.search) {
      where.employee = { name: Like(`%${queryDto.search}%`) };
    }

    return this.payrollRepository.find({
      where,
      relations: ['employee', 'employee.department', 'employee.role'],
      order: { period_start: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Payroll> {
    const payroll = await this.payrollRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.department', 'employee.role'],
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }

    return payroll;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePayrollStatusDto,
  ): Promise<Payroll> {
    const payroll = await this.findOne(id);

    // Validate status transition
    if (
      payroll.status === PayrollStatus.PAID &&
      updateStatusDto.status !== PayrollStatus.PAID
    ) {
      throw new BadRequestException(
        'Cannot change status once payroll is paid',
      );
    }

    this.payrollRepository.merge(payroll, updateStatusDto);

    // If status is set to PAID, record payment date
    if (
      updateStatusDto.status === PayrollStatus.PAID &&
      !payroll.payment_date
    ) {
      payroll.payment_date = new Date();
    }

    return this.payrollRepository.save(payroll);
  }

  async remove(id: number): Promise<void> {
    const payroll = await this.findOne(id);

    // Only allow deletion of draft payrolls
    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Only draft payrolls can be deleted');
    }

    await this.payrollRepository.remove(payroll);
  }

  async getPayrollStats(
    startDate: string,
    endDate: string,
    departmentId?: number,
  ) {
    try {
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role')
        .where('payroll.period_start >= :startDate', { startDate })
        .andWhere('payroll.period_end <= :endDate', { endDate });

      if (departmentId) {
        query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
      }

      const payrolls = await query.getMany();

      // Calculate statistics
      const totalPayrolls = payrolls.length;
      const uniqueEmployeeIds = [
        ...new Set(payrolls.map((p) => p.employee_id)),
      ];
      const totalEmployees = uniqueEmployeeIds.length;
      const totalGrossPay = payrolls.reduce(
        (sum, payroll) => sum + payroll.gross_pay,
        0,
      );
      const totalNetPay = payrolls.reduce(
        (sum, payroll) => sum + payroll.net_pay,
        0,
      );

      // Group by status
      const byStatus = {};
      payrolls.forEach((payroll) => {
        if (!byStatus[payroll.status]) {
          byStatus[payroll.status] = 0;
        }
        byStatus[payroll.status]++;
      });

      // Group by department
      const byDepartment: Record<
        string,
        {
          count: number;
          totalGrossPay: number;
          totalNetPay: number;
        }
      > = {};

      payrolls.forEach((payroll) => {
        const deptId = payroll.employee?.department?.id;
        if (deptId) {
          if (!byDepartment[deptId]) {
            byDepartment[deptId] = {
              count: 0,
              totalGrossPay: 0,
              totalNetPay: 0,
            };
          }
          byDepartment[deptId].count++;
          byDepartment[deptId].totalGrossPay += payroll.gross_pay;
          byDepartment[deptId].totalNetPay += payroll.net_pay;
        }
      });

      return {
        totalPayrolls,
        totalEmployees,
        totalGrossPay,
        totalNetPay,
        byStatus,
        byDepartment,
        monthlyTrend: await this.getMonthlyTrend(
          startDate,
          endDate,
          departmentId,
        ),
      };
    } catch (error) {
      this.logger.error(
        'Error getting payroll stats',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error getting payroll stats');
    }
  }

  private async getMonthlyTrend(
    startDate: string,
    endDate: string,
    departmentId?: number,
  ) {
    try {
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .where('payroll.period_start >= :startDate', { startDate })
        .andWhere('payroll.period_end <= :endDate', { endDate });

      if (departmentId) {
        query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
      }

      const payrolls = await query.getMany();

      // Group by month
      const monthlyData: Record<string, { grossPay: number; netPay: number }> =
        {};
      payrolls.forEach((payroll) => {
        const month = new Date(payroll.period_start).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = {
            grossPay: 0,
            netPay: 0,
          };
        }
        monthlyData[month].grossPay += payroll.gross_pay;
        monthlyData[month].netPay += payroll.net_pay;
      });

      // Convert to array for chart
      const trendData: Array<{
        month: string;
        grossPay: number;
        netPay: number;
      }> = [];
      for (const [month, data] of Object.entries(monthlyData)) {
        trendData.push({
          month,
          grossPay: data.grossPay,
          netPay: data.netPay,
        });
      }

      // Sort by month
      trendData.sort((a, b) => a.month.localeCompare(b.month));

      return trendData;
    } catch (error) {
      this.logger.error(
        'Error getting monthly trend',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error getting monthly trend');
    }
  }

  async getPayrollsByEmployee(
    employeeId: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role')
        .where('payroll.employee_id = :employeeId', { employeeId })
        .andWhere('payroll.period_start >= :startDate', { startDate })
        .andWhere('payroll.period_end <= :endDate', { endDate })
        .orderBy('payroll.period_start', 'DESC');

      return await query.getMany();
    } catch (error) {
      this.logger.error(
        'Error getting employee payrolls',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error getting employee payrolls');
    }
  }

  async getPayrollsByDepartment(
    departmentId: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role')
        .where('employee.department_id = :departmentId', { departmentId })
        .andWhere('payroll.period_start >= :startDate', { startDate })
        .andWhere('payroll.period_end <= :endDate', { endDate })
        .orderBy('payroll.period_start', 'DESC');

      return await query.getMany();
    } catch (error) {
      this.logger.error(
        'Error getting department payrolls',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error getting department payrolls',
      );
    }
  }

  async getPayrollComparison(
    periodStart1: string,
    periodEnd1: string,
    periodStart2: string,
    periodEnd2: string,
    departmentId?: number,
  ) {
    try {
      // Get data for first period
      const period1Query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .where('payroll.period_start >= :startDate', {
          startDate: periodStart1,
        })
        .andWhere('payroll.period_end <= :endDate', { endDate: periodEnd1 });

      // Get data for second period
      const period2Query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .where('payroll.period_start >= :startDate', {
          startDate: periodStart2,
        })
        .andWhere('payroll.period_end <= :endDate', { endDate: periodEnd2 });

      if (departmentId) {
        period1Query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
        period2Query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
      }

      const [period1Payrolls, period2Payrolls] = await Promise.all([
        period1Query.getMany(),
        period2Query.getMany(),
      ]);

      // Calculate statistics for each period
      const period1Stats = this.calculatePeriodStats(period1Payrolls);
      const period2Stats = this.calculatePeriodStats(period2Payrolls);

      // Calculate changes between periods
      const changes = {
        totalPayrolls: period2Stats.totalPayrolls - period1Stats.totalPayrolls,
        totalEmployees:
          period2Stats.totalEmployees - period1Stats.totalEmployees,
        totalGrossPay: period2Stats.totalGrossPay - period1Stats.totalGrossPay,
        totalNetPay: period2Stats.totalNetPay - period1Stats.totalNetPay,
        percentageChangeGross: period1Stats.totalGrossPay
          ? ((period2Stats.totalGrossPay - period1Stats.totalGrossPay) /
              period1Stats.totalGrossPay) *
            100
          : 0,
        percentageChangeNet: period1Stats.totalNetPay
          ? ((period2Stats.totalNetPay - period1Stats.totalNetPay) /
              period1Stats.totalNetPay) *
            100
          : 0,
      };

      return {
        period1: {
          startDate: periodStart1,
          endDate: periodEnd1,
          ...period1Stats,
        },
        period2: {
          startDate: periodStart2,
          endDate: periodEnd2,
          ...period2Stats,
        },
        changes,
      };
    } catch (error) {
      this.logger.error(
        'Error comparing payroll periods',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error comparing payroll periods');
    }
  }

  private calculatePeriodStats(payrolls: Payroll[]) {
    const totalPayrolls = payrolls.length;
    const uniqueEmployeeIds = [...new Set(payrolls.map((p) => p.employee_id))];
    const totalEmployees = uniqueEmployeeIds.length;
    const totalGrossPay = payrolls.reduce((sum, p) => sum + p.gross_pay, 0);
    const totalNetPay = payrolls.reduce((sum, p) => sum + p.net_pay, 0);

    return {
      totalPayrolls,
      totalEmployees,
      totalGrossPay,
      totalNetPay,
    };
  }

  async getPayrollTrends(
    startDate: string,
    endDate: string,
    groupBy: 'month' | 'week' | 'day',
    departmentId?: number,
  ) {
    try {
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .where('payroll.period_start >= :startDate', { startDate })
        .andWhere('payroll.period_end <= :endDate', { endDate });

      if (departmentId) {
        query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
      }

      const payrolls = await query.getMany();

      // Group data based on groupBy parameter
      const groupedData: Record<
        string,
        { grossPay: number; netPay: number; count: number }
      > = {};
      payrolls.forEach((payroll) => {
        let key: string;
        const date = new Date(payroll.period_start);

        if (groupBy === 'month') {
          key = date.toISOString().slice(0, 7); // YYYY-MM
        } else if (groupBy === 'week') {
          // Get the week number
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear =
            (date.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNumber = Math.ceil(
            (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7,
          );
          key = `${date.getFullYear()}-W${weekNumber}`;
        } else {
          key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            grossPay: 0,
            netPay: 0,
            count: 0,
          };
        }

        groupedData[key].grossPay += payroll.gross_pay;
        groupedData[key].netPay += payroll.net_pay;
        groupedData[key].count++;
      });

      // Convert to array for chart
      const trendData: Array<{
        period: string;
        grossPay: number;
        netPay: number;
        count: number;
        averageGrossPay: number;
        averageNetPay: number;
      }> = [];

      for (const [period, data] of Object.entries(groupedData)) {
        trendData.push({
          period,
          grossPay: data.grossPay,
          netPay: data.netPay,
          count: data.count,
          averageGrossPay: data.count ? data.grossPay / data.count : 0,
          averageNetPay: data.count ? data.netPay / data.count : 0,
        });
      }

      // Sort by period
      trendData.sort((a, b) => a.period.localeCompare(b.period));

      return trendData;
    } catch (error) {
      this.logger.error(
        'Error getting payroll trends',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error getting payroll trends');
    }
  }

  async getAttendanceIntegration(
    employeeId: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      // Lấy dữ liệu điểm danh của nhân viên trong khoảng thời gian
      const attendances = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .where('attendance.employee_id = :employeeId', { employeeId })
        .andWhere('attendance.date >= :startDate', { startDate })
        .andWhere('attendance.date <= :endDate', { endDate })
        .orderBy('attendance.date', 'ASC')
        .getMany();

      // Lấy dữ liệu bảng lương của nhân viên trong khoảng thời gian
      const payrolls = await this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .where('payroll.employee_id = :employeeId', { employeeId })
        .andWhere(
          '(payroll.period_start <= :endDate AND payroll.period_end >= :startDate)',
          { startDate, endDate },
        )
        .getMany();

      // Tính toán số liệu thống kê chấm công
      const summary: {
        totalWorkingDays: number;
        totalWorkingHours: number;
        presentCount: number;
        lateCount: number;
        earlyLeaveCount: number;
        absentCount: number;
        onLeaveCount: number;
        pendingCount: number;
        averageHoursPerDay?: number;
        estimatedSalary?: number;
      } = {
        totalWorkingDays: attendances.length,
        totalWorkingHours: attendances.reduce(
          (sum, att) => sum + (att.working_hours || 0),
          0,
        ),
        presentCount: attendances.filter(
          (att) => att.status === AttendanceStatus.APPROVED,
        ).length,
        lateCount: attendances.filter(
          (att) =>
            att.status === AttendanceStatus.APPROVED &&
            att.notes?.includes('late'),
        ).length,
        earlyLeaveCount: attendances.filter(
          (att) =>
            att.status === AttendanceStatus.APPROVED &&
            att.notes?.includes('early_leave'),
        ).length,
        absentCount: attendances.filter(
          (att) => att.status === AttendanceStatus.REJECTED,
        ).length,
        onLeaveCount: attendances.filter(
          (att) =>
            att.status === AttendanceStatus.APPROVED &&
            att.notes?.includes('on_leave'),
        ).length,
        pendingCount: attendances.filter(
          (att) => att.status === AttendanceStatus.PENDING,
        ).length,
      };

      // Tính giờ làm việc trung bình mỗi ngày
      summary.averageHoursPerDay = summary.totalWorkingDays
        ? summary.totalWorkingHours / summary.totalWorkingDays
        : 0;

      // Ước tính lương dựa trên số giờ làm việc
      let estimatedSalary = 0;
      if (payrolls.length > 0) {
        // Lấy bảng lương gần nhất để tính
        const latestPayroll = payrolls.sort(
          (a, b) =>
            new Date(b.period_end).getTime() - new Date(a.period_end).getTime(),
        )[0];

        // Tính lương trung bình mỗi giờ
        const hourlyRate =
          latestPayroll.total_working_hours > 0
            ? latestPayroll.gross_pay / latestPayroll.total_working_hours
            : 0;

        estimatedSalary = hourlyRate * summary.totalWorkingHours;
      }

      summary.estimatedSalary = estimatedSalary;

      // Tạo dữ liệu hàng ngày để hiển thị biểu đồ tương quan
      const dailyData: Array<{
        date: string;
        working_hours: number;
        status: AttendanceStatus;
        daily_pay: number;
      }> = [];

      attendances.forEach((att) => {
        const date = new Date(att.date);
        const dateStr = date.toISOString().slice(0, 10);

        // Tính lương ước tính hàng ngày
        let dailyPay = 0;
        if (payrolls.length > 0) {
          const payroll = payrolls.find(
            (p) =>
              new Date(p.period_start) <= date &&
              new Date(p.period_end) >= date,
          );

          if (payroll) {
            const dailyRate = payroll.gross_pay / 30; // Giả sử tháng có 30 ngày
            dailyPay = (dailyRate * (att.working_hours || 0)) / 8; // Giả sử ngày làm 8 giờ
          }
        }

        dailyData.push({
          date: dateStr,
          working_hours: att.working_hours || 0,
          status: att.status,
          daily_pay: dailyPay,
        });
      });

      return {
        attendances,
        payrolls,
        summary,
        dailyData,
      };
    } catch (error) {
      this.logger.error(
        'Error getting attendance-payroll integration',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error getting attendance-payroll integration',
      );
    }
  }

  async generateReport(
    format: string,
    filters: {
      startDate?: string;
      endDate?: string;
      departmentId?: number;
      employeeId?: number;
      status?: PayrollStatus;
    },
  ) {
    try {
      // Xử lý các bộ lọc
      const { startDate, endDate, departmentId, employeeId, status } = filters;

      // Xây dựng truy vấn
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role');

      if (startDate) {
        query.andWhere('payroll.period_start >= :startDate', { startDate });
      }

      if (endDate) {
        query.andWhere('payroll.period_end <= :endDate', { endDate });
      }

      if (departmentId) {
        query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
      }

      if (employeeId) {
        query.andWhere('payroll.employee_id = :employeeId', { employeeId });
      }

      if (status) {
        query.andWhere('payroll.status = :status', { status });
      }

      const payrolls = await query.getMany();

      // Tạo báo cáo theo định dạng
      if (format === 'pdf') {
        // Tạo file PDF với thư viện
        const pdfDoc = this.createPdfReport(payrolls);
        return pdfDoc;
      } else if (format === 'excel') {
        // Tạo file Excel với thư viện
        const excelBuffer = this.createExcelReport(payrolls);
        return excelBuffer;
      } else {
        // Mặc định trả về dữ liệu JSON
        return {
          data: payrolls,
          total: payrolls.length,
          summary: this.calculatePeriodStats(payrolls),
        };
      }
    } catch (error) {
      this.logger.error(
        'Error generating payroll report',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Error generating payroll report');
    }
  }

  private createPdfReport(payrolls: Payroll[]) {
    // Đoạn code này sẽ tạo file PDF
    // Hiện tại chỉ tạo giả để làm ví dụ
    this.logger.debug(`Creating PDF report for ${payrolls.length} payrolls`);
    return Buffer.from('PDF report content');
  }

  private createExcelReport(payrolls: Payroll[]) {
    // Đoạn code này sẽ tạo file Excel
    // Hiện tại chỉ tạo giả để làm ví dụ
    this.logger.debug(`Creating Excel report for ${payrolls.length} payrolls`);
    return Buffer.from('Excel report content');
  }
}
