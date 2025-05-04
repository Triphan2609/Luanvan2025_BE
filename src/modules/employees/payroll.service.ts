import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindOptionsWhere, In } from 'typeorm';
import {
  Payroll,
  PayrollStatus,
  PayrollPeriodType,
} from './entities/payroll.entity';
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
import { DataSource } from 'typeorm';
import { EmployeeShift } from '../shifts/entities/employee-shift.entity';
import { Department } from '../departments/entities/department.entity';
import { RoleEmployee } from '../roles_employee/entities/role-employee.entity';

// Export interface để controller có thể sử dụng
export interface EmployeeShiftWithRelations {
  id: number;
  employee_id: number;
  shift_id: number;
  date: Date;
  schedule_code: string;
  status: string;
  shift?: {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
  };
}

// Type definitions for error handling
interface DatabaseError extends Error {
  code?: string;
}

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
    private dataSource: DataSource,
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
    // Check if DTO has direct values for working metrics
    const hasDirectWorkingValues =
      createPayrollDto.total_working_hours !== undefined ||
      createPayrollDto.working_days !== undefined;

    // Tính tổng số giờ làm việc và các loại giờ - ensure values are valid numbers
    const totalWorkingHours = attendances.reduce(
      (sum, att) => sum + (Number(att.working_hours) || 0),
      0,
    );
    const overtimeHours = attendances.reduce(
      (sum, att) => sum + (Number(att.overtime_hours) || 0),
      0,
    );
    const nightShiftHours = attendances.reduce(
      (sum, att) => sum + (Number(att.night_shift_hours) || 0),
      0,
    );
    const holidayHours = attendances.reduce(
      (sum, att) => sum + (Number(att.holiday_hours) || 0),
      0,
    );

    // Override with values from DTO if provided
    const finalTotalWorkingHours =
      createPayrollDto.total_working_hours !== undefined
        ? Number(createPayrollDto.total_working_hours)
        : totalWorkingHours;

    const finalOvertimeHours =
      createPayrollDto.overtime_hours !== undefined
        ? Number(createPayrollDto.overtime_hours)
        : overtimeHours;

    const finalNightShiftHours =
      createPayrollDto.night_shift_hours !== undefined
        ? Number(createPayrollDto.night_shift_hours)
        : nightShiftHours;

    const finalHolidayHours =
      createPayrollDto.holiday_hours !== undefined
        ? Number(createPayrollDto.holiday_hours)
        : holidayHours;

    // Tính tổng số ca làm việc (giả sử mỗi ca 8 giờ)
    const standardHoursPerDay =
      Number(salaryConfig.standard_hours_per_day) || 8;
    const totalShifts = Math.ceil(finalTotalWorkingHours / standardHoursPerDay);

    // Mức lương cơ bản
    const baseSalary =
      Number(createPayrollDto.base_salary) ||
      Number(salaryConfig.base_salary) ||
      0;

    let normalSalary = 0;
    let overtimePay = 0;
    let nightShiftPay = 0;
    let holidayPay = 0;

    // Tính lương theo loại
    switch (salaryConfig.salary_type) {
      case SalaryType.MONTHLY: {
        // Lương tháng
        let workingDays = attendances.length || 0;
        const standardDaysInMonth =
          Number(salaryConfig.standard_days_per_month) || 22;

        // If there are no attendances but we need to calculate a minimal salary
        if (workingDays === 0 && !hasDirectWorkingValues) {
          // Use a fraction of the period days or a minimum of 1 day
          workingDays = Math.max(1, Math.floor(periodDays / 4));
          this.logger.debug(
            `No attendance data. Using estimated working days: ${workingDays} for period of ${periodDays} days`,
          );
        }

        // Override with direct values if provided
        if (createPayrollDto.working_days !== undefined) {
          workingDays = Number(createPayrollDto.working_days);
        }

        // Lương ngày công bình thường - ensure division by zero protection
        normalSalary =
          standardDaysInMonth > 0
            ? (baseSalary / standardDaysInMonth) * Math.max(workingDays, 1)
            : 0;

        // Đảm bảo lương cơ bản không nhỏ hơn 0
        normalSalary = Math.max(normalSalary, 0);

        // Lương tăng ca, ca đêm, ngày lễ
        const hourlyRate =
          standardDaysInMonth > 0 && standardHoursPerDay > 0
            ? baseSalary / (standardDaysInMonth * standardHoursPerDay)
            : 0;

        // Đảm bảo hourlyRate là một số dương
        const validHourlyRate = Math.max(hourlyRate, 0);

        // Tính toán hệ số từ cấu hình hoặc giá trị trực tiếp từ DTO
        const nightShiftMultiplier = Number(
          createPayrollDto.night_shift_multiplier !== undefined
            ? createPayrollDto.night_shift_multiplier
            : salaryConfig.night_shift_multiplier || 1.3,
        );

        // Đảm bảo hệ số không nhỏ hơn 1
        const validNightShiftMultiplier = Math.max(nightShiftMultiplier, 1.0);

        // Tính lương ca đêm với kiểm tra giá trị
        if (finalNightShiftHours > 0) {
          this.logger.debug(
            `Night shift calculation: ${finalNightShiftHours} hours * ${validHourlyRate} hourly rate * ${validNightShiftMultiplier} multiplier`,
          );
          // Đảm bảo đủ tham số cho phép tính
          if (validHourlyRate <= 0) {
            this.logger.warn(
              `Hourly rate is too low or invalid: ${validHourlyRate}. Using minimum hourly rate.`,
            );
            // Sử dụng mức lương giờ tối thiểu nếu hourlyRate không hợp lệ
            const minimumHourlyRate = 25000; // Giá trị mặc định tối thiểu

            // Lương ca đêm = (giờ làm ca đêm) * (lương giờ) * (hệ số)
            nightShiftPay =
              finalNightShiftHours *
              minimumHourlyRate *
              validNightShiftMultiplier;

            this.logger.debug(
              `Recalculated night shift pay using minimum hourly rate: ${finalNightShiftHours} hours * ${minimumHourlyRate} rate * ${validNightShiftMultiplier} = ${nightShiftPay}`,
            );
          } else {
            // Lương ca đêm = (giờ làm ca đêm) * (lương giờ) * (hệ số)
            nightShiftPay =
              finalNightShiftHours *
              validHourlyRate *
              validNightShiftMultiplier;

            this.logger.debug(
              `Recalculated night shift pay (monthly): ${finalNightShiftHours} hours * ${validHourlyRate} rate * ${validNightShiftMultiplier} = ${nightShiftPay}`,
            );
          }
        } else {
          nightShiftPay = 0;
        }

        overtimePay =
          finalOvertimeHours *
          validHourlyRate *
          Number(salaryConfig.overtime_multiplier || 1.5);

        holidayPay =
          finalHolidayHours *
          validHourlyRate *
          Number(salaryConfig.holiday_multiplier || 2);
        break;
      }

      case SalaryType.HOURLY: {
        // Lương giờ
        const hourlyRate = Number(salaryConfig.hourly_rate) || 0;

        // Kiểm tra xem hourlyRate có giá trị hợp lệ không
        this.logger.debug(
          `HOURLY type calculation with hourly_rate: ${hourlyRate}`,
        );

        // Nếu hourly_rate chưa được thiết lập, tính toán dựa trên base_salary
        const effectiveHourlyRate =
          hourlyRate > 0
            ? hourlyRate
            : baseSalary /
              (standardHoursPerDay *
                (salaryConfig.standard_days_per_month || 22));

        this.logger.debug(
          `Effective hourly rate calculated: ${effectiveHourlyRate}`,
        );

        // Calculate minimum working hours if no actual attendance data
        let workingHoursToCalculate = finalTotalWorkingHours;
        if (workingHoursToCalculate === 0 && !hasDirectWorkingValues) {
          // Minimum calculation - use a fraction of period days * standard hours
          workingHoursToCalculate = Math.max(
            standardHoursPerDay,
            (periodDays * standardHoursPerDay) / 4,
          );
          this.logger.debug(
            `No attendance data. Using estimated working hours: ${workingHoursToCalculate}`,
          );
        }

        // Lương bình thường - đảm bảo có ít nhất 1 giờ làm việc để tính lương
        const standardHours = Math.max(
          workingHoursToCalculate -
            finalOvertimeHours -
            finalNightShiftHours -
            finalHolidayHours,
          0.1,
        );
        normalSalary =
          standardHours > 0
            ? standardHours * effectiveHourlyRate
            : effectiveHourlyRate;

        // Đảm bảo hourlyRate là một số dương
        const validHourlyRate = Math.max(effectiveHourlyRate, 0);

        // Tính toán hệ số từ cấu hình hoặc giá trị trực tiếp từ DTO
        const nightShiftMultiplier = Number(
          createPayrollDto.night_shift_multiplier !== undefined
            ? createPayrollDto.night_shift_multiplier
            : salaryConfig.night_shift_multiplier || 1.3,
        );

        // Đảm bảo hệ số không nhỏ hơn 1
        const validNightShiftMultiplier = Math.max(nightShiftMultiplier, 1.0);

        // Lương tăng ca, ca đêm, ngày lễ
        overtimePay =
          finalOvertimeHours *
          validHourlyRate *
          Number(salaryConfig.overtime_multiplier || 1.5);

        // Tính lương ca đêm với kiểm tra giá trị
        if (finalNightShiftHours > 0) {
          this.logger.debug(
            `Night shift calculation (hourly): ${finalNightShiftHours} hours * ${validHourlyRate} hourly rate * ${validNightShiftMultiplier} multiplier`,
          );
          // Đảm bảo đủ tham số cho phép tính
          if (validHourlyRate <= 0) {
            this.logger.warn(
              `Hourly rate is too low or invalid: ${validHourlyRate}. Using minimum hourly rate.`,
            );
            // Sử dụng mức lương giờ tối thiểu nếu hourlyRate không hợp lệ
            const minimumHourlyRate = 25000; // Giá trị mặc định tối thiểu
            nightShiftPay =
              finalNightShiftHours *
              minimumHourlyRate *
              validNightShiftMultiplier;

            this.logger.debug(
              `Recalculated night shift pay using minimum hourly rate: ${finalNightShiftHours} hours * ${minimumHourlyRate} rate * ${validNightShiftMultiplier} = ${nightShiftPay}`,
            );
          } else {
            nightShiftPay =
              finalNightShiftHours *
              validHourlyRate *
              validNightShiftMultiplier;

            this.logger.debug(
              `Recalculated night shift pay (hourly): ${finalNightShiftHours} hours * ${validHourlyRate} rate * ${validNightShiftMultiplier} = ${nightShiftPay}`,
            );
          }
        } else {
          nightShiftPay = 0;
        }

        holidayPay =
          finalHolidayHours *
          validHourlyRate *
          Number(salaryConfig.holiday_multiplier || 2);
        break;
      }

      case SalaryType.SHIFT: {
        // Lương theo ca
        const shiftRate = Number(salaryConfig.shift_rate) || 0;

        // Calculate minimum shifts if no attendance data
        let shiftsToCalculate = totalShifts;
        if (shiftsToCalculate === 0 && !hasDirectWorkingValues) {
          // Use a fraction of period or minimum 1
          shiftsToCalculate = Math.max(1, Math.floor(periodDays / 4));
          this.logger.debug(
            `No attendance data. Using estimated shifts: ${shiftsToCalculate}`,
          );
        }

        // Lương bình thường - đảm bảo có ít nhất 1 ca để tính lương
        normalSalary = Math.max(shiftsToCalculate, 1) * shiftRate;

        // Lương tăng ca, ca đêm, ngày lễ (tính theo giờ)
        const hourlyShiftRate =
          standardHoursPerDay > 0 ? shiftRate / standardHoursPerDay : 0;

        // Đảm bảo hourlyShiftRate là một số dương
        const validHourlyShiftRate = Math.max(hourlyShiftRate, 0);

        // Tính toán hệ số từ cấu hình hoặc giá trị trực tiếp từ DTO
        const nightShiftMultiplier = Number(
          createPayrollDto.night_shift_multiplier !== undefined
            ? createPayrollDto.night_shift_multiplier
            : salaryConfig.night_shift_multiplier || 1.3,
        );

        // Đảm bảo hệ số không nhỏ hơn 1
        const validNightShiftMultiplier = Math.max(nightShiftMultiplier, 1.0);

        overtimePay =
          finalOvertimeHours *
          validHourlyShiftRate *
          Number(salaryConfig.overtime_multiplier || 1.5);

        // Tính lương ca đêm với kiểm tra giá trị
        if (finalNightShiftHours > 0) {
          this.logger.debug(
            `Night shift calculation (shift): ${finalNightShiftHours} hours * ${validHourlyShiftRate} hourly rate * ${validNightShiftMultiplier} multiplier`,
          );
          // Đảm bảo đủ tham số cho phép tính
          if (validHourlyShiftRate <= 0) {
            this.logger.warn(
              `Hourly shift rate is too low or invalid: ${validHourlyShiftRate}. Using shift rate.`,
            );
            // Sử dụng mức lương ca tính theo giờ thay thế
            const alternativeRate = shiftRate / 8; // Giả sử 1 ca làm 8 giờ

            // Lương ca đêm = (giờ làm ca đêm) * (lương giờ) * (hệ số)
            nightShiftPay =
              finalNightShiftHours *
              alternativeRate *
              validNightShiftMultiplier;

            this.logger.debug(
              `Recalculated night shift pay using alternative shift rate: ${finalNightShiftHours} hours * ${alternativeRate} rate * ${validNightShiftMultiplier} = ${nightShiftPay}`,
            );
          } else {
            // Lương ca đêm = (giờ làm ca đêm) * (lương giờ) * (hệ số)
            nightShiftPay =
              finalNightShiftHours *
              validHourlyShiftRate *
              validNightShiftMultiplier;

            this.logger.debug(
              `Recalculated night shift pay (shift): ${finalNightShiftHours} hours * ${validHourlyShiftRate} rate * ${validNightShiftMultiplier} = ${nightShiftPay}`,
            );
          }
        } else {
          nightShiftPay = 0;
        }

        holidayPay =
          finalHolidayHours *
          validHourlyShiftRate *
          Number(salaryConfig.holiday_multiplier || 2);
        break;
      }

      default:
        throw new BadRequestException(
          `Không hỗ trợ loại lương: ${String(salaryConfig.salary_type)}`,
        );
    }

    // Ensure all values are valid numbers and not too small
    normalSalary = !isNaN(normalSalary) ? Math.max(normalSalary, 0) : 0;
    overtimePay = !isNaN(overtimePay) ? Math.max(overtimePay, 0) : 0;
    nightShiftPay = !isNaN(nightShiftPay) ? Math.max(nightShiftPay, 0) : 0;
    holidayPay = !isNaN(holidayPay) ? Math.max(holidayPay, 0) : 0;

    // Ghi log kết quả tính toán
    this.logger.debug(
      `Final salary calculation results: 
      normalSalary: ${normalSalary}, 
      overtimePay: ${overtimePay}, 
      nightShiftPay: ${nightShiftPay}, 
      holidayPay: ${holidayPay}, 
      nightShiftHours: ${finalNightShiftHours}`,
    );

    return {
      normalSalary,
      overtimePay,
      nightShiftPay,
      holidayPay,
      totalWorkingHours: finalTotalWorkingHours,
      overtimeHours: finalOvertimeHours,
      nightShiftHours: finalNightShiftHours,
      holidayHours: finalHolidayHours,
      totalShifts,
    };
  }

  async create(createPayrollDto: CreatePayrollDto): Promise<Payroll> {
    const { employee_id, period_start, period_end, period_type } =
      createPayrollDto;

    try {
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
      const startDateObj = new Date(period_start);
      const endDateObj = new Date(period_end);

      // Format dates to database format to avoid timezone issues
      const formattedStartDate = startDateObj.toISOString().split('T')[0];
      const formattedEndDate = endDateObj.toISOString().split('T')[0];

      // Use query builder for more control over the date comparison
      const existingPayroll = await this.payrollRepository
        .createQueryBuilder('payroll')
        .where('payroll.employee_id = :employeeId', { employeeId: employee_id })
        .andWhere('DATE(payroll.period_start) = :startDate', {
          startDate: formattedStartDate,
        })
        .andWhere('DATE(payroll.period_end) = :endDate', {
          endDate: formattedEndDate,
        })
        .getOne();

      if (existingPayroll) {
        throw new ConflictException(
          `Đã tồn tại bảng lương cho nhân viên ${employee.name} (ID: ${employee_id}) trong kỳ này`,
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
        relations: ['employeeShift', 'employeeShift.shift'],
      });

      // Đảm bảo luôn có dữ liệu để tính lương - nếu không có chấm công đã duyệt
      if (attendances.length === 0) {
        this.logger.warn(
          `No approved attendances found for employee ${employee_id} in period ${period_start} to ${period_end}. Using minimum values for calculation.`,
        );

        // Tìm tất cả các chấm công kể cả chưa duyệt để hiện thị trong thông tin
        const allAttendances = await this.attendanceRepository.find({
          where: {
            employee_id,
            date: Between(new Date(period_start), new Date(period_end)),
          },
          relations: ['employeeShift', 'employeeShift.shift'],
        });

        // Log thông tin để debug
        this.logger.debug(
          `Found ${allAttendances.length} total attendances (including non-approved) for employee ${employee_id}`,
        );
      }

      // Tính lương theo loại lương
      const salaryCalculation = this.calculateSalaryByType(
        salaryConfig,
        attendances,
        daysInPeriod,
        createPayrollDto,
      );

      // Phụ cấp không tính thuế
      const mealAllowance =
        createPayrollDto.allowances?.meal_allowance ??
        salaryConfig.meal_allowance ??
        0;
      const transportAllowance =
        createPayrollDto.allowances?.transport_allowance ??
        salaryConfig.transport_allowance ??
        0;

      // Phụ cấp có tính thuế
      const housingAllowance =
        createPayrollDto.allowances?.housing_allowance ??
        salaryConfig.housing_allowance ??
        0;
      const positionAllowance =
        createPayrollDto.allowances?.position_allowance ??
        salaryConfig.position_allowance ??
        0;
      const responsibilityAllowance =
        createPayrollDto.allowances?.responsibility_allowance ??
        salaryConfig.responsibility_allowance ??
        0;
      const phoneAllowance =
        createPayrollDto.allowances?.phone_allowance ??
        salaryConfig.phone_allowance ??
        0;

      // Thưởng
      const attendanceBonus =
        createPayrollDto.allowances?.attendance_bonus ??
        salaryConfig.attendance_bonus ??
        0;
      const performanceBonus =
        createPayrollDto.allowances?.performance_bonus ?? 0;

      // Ngưỡng miễn thuế cho phụ cấp
      const mealAllowanceTaxThreshold =
        salaryConfig.meal_allowance_tax_threshold || 730000;
      const phoneAllowanceTaxThreshold =
        salaryConfig.phone_allowance_tax_threshold || 1000000;

      // Tính phần phụ cấp tính thuế và không tính thuế
      let taxableMealAllowance = 0;
      let nonTaxableMealAllowance = Number(mealAllowance);
      if (Number(mealAllowance) > mealAllowanceTaxThreshold) {
        taxableMealAllowance =
          Number(mealAllowance) - mealAllowanceTaxThreshold;
        nonTaxableMealAllowance = mealAllowanceTaxThreshold;
      }

      let taxablePhoneAllowance = 0;
      let nonTaxablePhoneAllowance = Number(phoneAllowance);
      if (Number(phoneAllowance) > phoneAllowanceTaxThreshold) {
        taxablePhoneAllowance =
          Number(phoneAllowance) - phoneAllowanceTaxThreshold;
        nonTaxablePhoneAllowance = phoneAllowanceTaxThreshold;
      }

      // Tổng phụ cấp tính thuế
      const taxableAllowances =
        taxableMealAllowance +
        taxablePhoneAllowance +
        Number(housingAllowance) +
        Number(positionAllowance) +
        Number(responsibilityAllowance) +
        Number(attendanceBonus) +
        Number(performanceBonus);

      // Tổng phụ cấp không tính thuế
      const nonTaxableAllowances =
        nonTaxableMealAllowance +
        nonTaxablePhoneAllowance +
        Number(transportAllowance);

      // Tổng phụ cấp
      const totalAllowances = taxableAllowances + nonTaxableAllowances;

      // Log phụ cấp để debug
      this.logger.debug(
        `Phụ cấp:
        Ăn ca (không tính thuế)=${nonTaxableMealAllowance}, (tính thuế)=${taxableMealAllowance}
        Đi lại=${transportAllowance}
        Điện thoại (không tính thuế)=${nonTaxablePhoneAllowance}, (tính thuế)=${taxablePhoneAllowance}
        Nhà ở=${housingAllowance}
        Chức vụ=${positionAllowance}
        Trách nhiệm=${responsibilityAllowance}
        Chuyên cần=${attendanceBonus}
        Hiệu suất=${performanceBonus}
        Tổng phụ cấp tính thuế=${taxableAllowances}
        Tổng phụ cấp không tính thuế=${nonTaxableAllowances}
        Tổng phụ cấp=${totalAllowances}`,
      );

      // Tổng lương gộp (chịu thuế)
      const grossPayTaxable =
        salaryCalculation.normalSalary +
        salaryCalculation.overtimePay +
        salaryCalculation.nightShiftPay +
        salaryCalculation.holidayPay +
        taxableAllowances;

      // Tổng lương gộp (bao gồm cả phần không tính thuế)
      const grossPay = grossPayTaxable + nonTaxableAllowances;

      // Ensure grossPay is a valid number
      const validatedGrossPay =
        !isNaN(grossPay) && grossPay > 0
          ? grossPay
          : salaryCalculation.normalSalary;

      // Đảm bảo validatedGrossPayTaxable là số hợp lệ
      const validatedGrossPayTaxable =
        !isNaN(grossPayTaxable) && grossPayTaxable > 0
          ? grossPayTaxable
          : salaryCalculation.normalSalary;

      // Kiểm tra giá trị tính toán lương ca đêm
      if (salaryCalculation.nightShiftHours > 0) {
        this.logger.debug(
          `Night shift pay validation: 
          Hours: ${salaryCalculation.nightShiftHours} 
          Pay: ${salaryCalculation.nightShiftPay} 
          Multiplier: ${salaryConfig.night_shift_multiplier || createPayrollDto.night_shift_multiplier || 1.3}`,
        );
      }

      // Log to debug
      this.logger.debug(
        `Payroll calculation for employee ${employee_id}: 
        Normal Salary: ${salaryCalculation.normalSalary}, 
        Overtime: ${salaryCalculation.overtimePay}, 
        Night Shift: ${salaryCalculation.nightShiftPay} (${salaryCalculation.nightShiftHours} hours), 
        Holiday: ${salaryCalculation.holidayPay}, 
        Allowances: ${totalAllowances}, 
        Gross Pay: ${validatedGrossPay}`,
      );

      // Các khoản khấu trừ
      const taxRate =
        createPayrollDto.deductions?.tax !== undefined
          ? !isNaN(Number(createPayrollDto.deductions.tax)) &&
            validatedGrossPay > 0
            ? Number(createPayrollDto.deductions.tax) / validatedGrossPay
            : 0
          : salaryConfig.tax_rate || 0;

      const insuranceRate =
        createPayrollDto.deductions?.insurance !== undefined
          ? !isNaN(Number(createPayrollDto.deductions.insurance)) &&
            validatedGrossPay > 0
            ? Number(createPayrollDto.deductions.insurance) / validatedGrossPay
            : 0
          : salaryConfig.insurance_rate || 0;

      const otherDeductions =
        createPayrollDto.deductions?.other_deductions !== undefined
          ? !isNaN(Number(createPayrollDto.deductions.other_deductions))
            ? Number(createPayrollDto.deductions.other_deductions)
            : 0
          : 0;

      // Tính thuế và bảo hiểm - ensure values are numeric and not NaN
      // Lưu ý: Thuế chỉ tính trên phần lương chịu thuế (validatedGrossPayTaxable)
      const tax = !isNaN(validatedGrossPayTaxable * taxRate)
        ? validatedGrossPayTaxable * taxRate
        : 0;
      const insurance = !isNaN(validatedGrossPayTaxable * insuranceRate)
        ? validatedGrossPayTaxable * insuranceRate
        : 0;

      // Tổng khấu trừ - check for NaN
      const totalDeductions = !isNaN(tax + insurance + otherDeductions)
        ? tax + insurance + otherDeductions
        : 0;

      // Lương thực lãnh - check for NaN
      const netPay = !isNaN(validatedGrossPay - totalDeductions)
        ? validatedGrossPay - totalDeductions
        : validatedGrossPay; // If deductions calculation fails, default to gross pay

      // Tạo mã bảng lương
      const payrollCode = await this.generatePayrollCode(
        employee.employee_code,
      );

      // Helper function to sanitize numeric values
      const sanitizeNumber = (value: any): number => {
        const num = Number(value);
        return !isNaN(num) ? num : 0;
      };

      // Lưu hệ số ca đêm
      const nightShiftMultiplier = createPayrollDto.night_shift_multiplier
        ? Number(createPayrollDto.night_shift_multiplier)
        : salaryConfig.night_shift_multiplier || 1.3;

      // Đánh dấu các attendance đã được xử lý trong payroll này
      if (attendances.length > 0) {
        await this.attendanceRepository.update(
          attendances.map((att) => att.id),
          { is_processed: true },
        );
      }

      // Tạo bảng lương
      const payrollEntity = this.payrollRepository.create({
        payroll_code: payrollCode,
        employee_id,
        salary_config_id: salaryConfig.id,
        salary_type: salaryConfig.salary_type,
        period_start: new Date(period_start),
        period_end: new Date(period_end),
        period_type,
        base_salary: sanitizeNumber(
          createPayrollDto.base_salary || salaryConfig.base_salary || 0,
        ),
        hourly_rate: sanitizeNumber(salaryConfig.hourly_rate),
        shift_rate: sanitizeNumber(salaryConfig.shift_rate),
        working_days: sanitizeNumber(
          createPayrollDto.working_days || attendances.length || 0,
        ),
        total_working_hours: sanitizeNumber(
          salaryCalculation.totalWorkingHours,
        ),
        overtime_hours: sanitizeNumber(salaryCalculation.overtimeHours),
        night_shift_hours: sanitizeNumber(salaryCalculation.nightShiftHours),
        holiday_hours: sanitizeNumber(salaryCalculation.holidayHours),
        total_shifts: sanitizeNumber(salaryCalculation.totalShifts),
        overtime_multiplier: sanitizeNumber(
          salaryConfig.overtime_multiplier || 1.5,
        ),
        night_shift_multiplier: sanitizeNumber(nightShiftMultiplier),
        holiday_multiplier: sanitizeNumber(
          salaryConfig.holiday_multiplier || 2,
        ),
        normal_salary: sanitizeNumber(salaryCalculation.normalSalary),
        overtime_pay: sanitizeNumber(salaryCalculation.overtimePay),
        night_shift_pay: sanitizeNumber(salaryCalculation.nightShiftPay),
        holiday_pay: sanitizeNumber(salaryCalculation.holidayPay),
        meal_allowance: sanitizeNumber(
          nonTaxableMealAllowance + taxableMealAllowance,
        ),
        transport_allowance: sanitizeNumber(transportAllowance),
        phone_allowance: sanitizeNumber(
          nonTaxablePhoneAllowance + taxablePhoneAllowance,
        ),
        housing_allowance: sanitizeNumber(housingAllowance),
        position_allowance: sanitizeNumber(positionAllowance),
        responsibility_allowance: sanitizeNumber(responsibilityAllowance),
        attendance_bonus: sanitizeNumber(attendanceBonus),
        performance_bonus: sanitizeNumber(performanceBonus),
        allowances: sanitizeNumber(totalAllowances),
        taxable_allowances: sanitizeNumber(taxableAllowances),
        non_taxable_allowances: sanitizeNumber(nonTaxableAllowances),
        tax: sanitizeNumber(tax),
        tax_rate: sanitizeNumber(taxRate),
        insurance: sanitizeNumber(insurance),
        insurance_rate: sanitizeNumber(insuranceRate),
        other_deductions: sanitizeNumber(otherDeductions),
        deductions: sanitizeNumber(totalDeductions),
        gross_pay: sanitizeNumber(validatedGrossPay),
        net_pay: sanitizeNumber(netPay),
        status: createPayrollDto.status || PayrollStatus.DRAFT,
        created_by: createPayrollDto.created_by,
        notes: createPayrollDto.notes,
        attendance_data: JSON.stringify(attendances),
      });

      // Log để kiểm tra giá trị trước khi lưu
      this.logger.debug(
        `Gross pay before validation: ${payrollEntity.gross_pay}`,
      );
      this.logger.debug(`Night shift pay: ${payrollEntity.night_shift_pay}`);
      this.logger.debug(`Total allowances: ${payrollEntity.allowances}`);
      this.logger.debug(`Meal allowance: ${payrollEntity.meal_allowance}`);

      // Đảm bảo tổng lương gộp bao gồm tất cả các khoản
      payrollEntity.gross_pay =
        sanitizeNumber(payrollEntity.normal_salary) +
        sanitizeNumber(payrollEntity.overtime_pay) +
        sanitizeNumber(payrollEntity.night_shift_pay) +
        sanitizeNumber(payrollEntity.holiday_pay) +
        sanitizeNumber(payrollEntity.allowances);

      // Kiểm tra và log chi tiết đảm bảo các khoản phụ cấp được tính vào lương gộp
      this.logger.debug(`Gross pay after fix: ${payrollEntity.gross_pay}`);
      this.logger.debug(`Details of gross_pay components:`);
      this.logger.debug(`Normal salary: ${payrollEntity.normal_salary}`);
      this.logger.debug(`Overtime pay: ${payrollEntity.overtime_pay}`);
      this.logger.debug(`Night shift pay: ${payrollEntity.night_shift_pay}`);
      this.logger.debug(`Holiday pay: ${payrollEntity.holiday_pay}`);
      this.logger.debug(`Allowances: ${payrollEntity.allowances}`);
      this.logger.debug(`  - Meal: ${payrollEntity.meal_allowance}`);
      this.logger.debug(`  - Transport: ${payrollEntity.transport_allowance}`);
      this.logger.debug(`  - Phone: ${payrollEntity.phone_allowance}`);
      this.logger.debug(`  - Housing: ${payrollEntity.housing_allowance}`);
      this.logger.debug(`  - Position: ${payrollEntity.position_allowance}`);
      this.logger.debug(
        `  - Responsibility: ${payrollEntity.responsibility_allowance}`,
      );
      this.logger.debug(`  - Attendance: ${payrollEntity.attendance_bonus}`);
      this.logger.debug(`  - Performance: ${payrollEntity.performance_bonus}`);

      // Tính lại lương thực lãnh
      payrollEntity.net_pay =
        payrollEntity.gross_pay - payrollEntity.deductions;

      // Save with try-catch to handle unique constraint errors
      try {
        const savedPayroll = await this.payrollRepository.save(payrollEntity);
        this.logger.debug(
          `Saved payroll with ID ${savedPayroll.id}. Gross pay: ${savedPayroll.gross_pay}, Net pay: ${savedPayroll.net_pay}`,
        );
        return savedPayroll;
      } catch (error: unknown) {
        const dbError = error as DatabaseError;

        // Handle MySQL unique constraint error
        if (dbError.code === 'ER_DUP_ENTRY') {
          throw new ConflictException(
            `Không thể tạo bảng lương. Đã tồn tại bảng lương cho nhân viên ${employee.name} trong kỳ này.`,
          );
        }

        // Handle PostgreSQL unique constraint error
        if (dbError.code === '23505') {
          throw new ConflictException(
            `Không thể tạo bảng lương. Đã tồn tại bảng lương cho nhân viên ${employee.name} trong kỳ này.`,
          );
        }

        // Rethrow other errors
        throw error;
      }
    } catch (error: unknown) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const dbError = error as Error;
      const errorMessage = dbError.message || 'Unknown error';
      throw new InternalServerErrorException(
        `Không thể tạo bảng lương: ${errorMessage}`,
      );
    }
  }

  async findAll(queryDto: QueryPayrollDto): Promise<Payroll[]> {
    this.logger.debug(
      `Finding payrolls with filters: ${JSON.stringify(queryDto)}`,
    );

    try {
      const where: FindOptionsWhere<Payroll> = {};

      // Apply filters
      if (queryDto.employee_id) {
        where.employee_id = queryDto.employee_id;
      }

      if (queryDto.department_id) {
        where.employee = { department: { id: queryDto.department_id } };
      }

      // Fix date filtering to properly include payrolls in the date range
      if (queryDto.start_date && queryDto.end_date) {
        // Sửa đổi cách xử lý để mở rộng phạm vi tìm kiếm
        const startDate = new Date(queryDto.start_date);
        const endDate = new Date(queryDto.end_date);

        // Đảm bảo endDate được đặt vào cuối ngày để bao gồm tất cả payrolls
        endDate.setHours(23, 59, 59, 999);

        this.logger.debug(
          `Date range filter: ${startDate.toISOString()} to ${endDate.toISOString()}`,
        );

        // Thay đổi cách lọc để bắt payroll có period_start HOẶC period_end nằm trong khoảng
        where.period_start = Between(startDate, endDate);

        // Ghi log để debug
        this.logger.debug(
          `Using date filter: period_start Between ${startDate.toISOString()} and ${endDate.toISOString()}`,
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

      this.logger.debug(`Final query conditions: ${JSON.stringify(where)}`);

      // Sử dụng query Builder để có nhiều kiểm soát hơn
      let query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role');

      // Áp dụng các điều kiện
      if (queryDto.employee_id) {
        query = query.andWhere('payroll.employee_id = :employeeId', {
          employeeId: queryDto.employee_id,
        });
      }

      if (queryDto.department_id) {
        query = query.andWhere('employee.department_id = :departmentId', {
          departmentId: queryDto.department_id,
        });
      }

      if (queryDto.start_date && queryDto.end_date) {
        const startDate = new Date(queryDto.start_date);
        const endDate = new Date(queryDto.end_date);
        endDate.setHours(23, 59, 59, 999);

        query = query.andWhere(
          '(payroll.period_start BETWEEN :startDate AND :endDate OR payroll.period_end BETWEEN :startDate AND :endDate)',
          { startDate, endDate },
        );
      }

      if (queryDto.period_type) {
        query = query.andWhere('payroll.period_type = :periodType', {
          periodType: queryDto.period_type,
        });
      }

      if (queryDto.status) {
        query = query.andWhere('payroll.status = :status', {
          status: queryDto.status,
        });
      }

      if (queryDto.search) {
        query = query.andWhere('employee.name LIKE :search', {
          search: `%${queryDto.search}%`,
        });
      }

      // Thêm sắp xếp
      query = query
        .orderBy('payroll.period_start', 'DESC')
        .addOrderBy('payroll.created_at', 'DESC');

      // Thực hiện truy vấn
      const payrolls = await query.getMany();

      this.logger.debug(
        `Found ${payrolls.length} payrolls with query builder approach`,
      );
      return payrolls;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error fetching payrolls: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Không thể lấy danh sách bảng lương: ${errorMessage}`,
      );
    }
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

  /**
   * Marks a payroll as paid after successful payment
   * @param id Payroll ID
   * @param paymentDetails Optional payment details
   * @returns Updated payroll
   */
  async markAsPaid(
    id: number,
    paymentDetails?: {
      paymentDate?: Date;
      notes?: string;
      paymentReference?: string;
    },
  ): Promise<Payroll> {
    const payroll = await this.findOne(id);

    // Check if payroll is in the right status to be paid
    if (payroll.status === PayrollStatus.PAID) {
      throw new BadRequestException('Payroll is already marked as paid');
    }

    if (payroll.status === PayrollStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot process payment for a cancelled payroll',
      );
    }

    // Set payment details
    payroll.status = PayrollStatus.PAID;
    payroll.payment_date = paymentDetails?.paymentDate || new Date();

    // Update notes if provided
    if (paymentDetails?.notes) {
      payroll.notes = payroll.notes
        ? `${payroll.notes}\n[PAYMENT] ${paymentDetails.notes}`
        : `[PAYMENT] ${paymentDetails.notes}`;
    }

    // Add payment reference to notes if provided
    if (paymentDetails?.paymentReference) {
      const referenceNote = `Payment Reference: ${paymentDetails.paymentReference}`;
      payroll.notes = payroll.notes
        ? `${payroll.notes}\n${referenceNote}`
        : referenceNote;
    }

    this.logger.log(
      `Marking payroll #${id} as paid with date: ${payroll.payment_date.toISOString()}`,
    );

    // Save and return the updated payroll
    return this.payrollRepository.save(payroll);
  }

  /**
   * Batch process to mark multiple payrolls as paid
   * @param ids Array of payroll IDs
   * @param paymentDetails Optional payment details
   * @returns Summary of the operation
   */
  async batchMarkAsPaid(
    ids: number[],
    paymentDetails?: {
      paymentDate?: Date;
      notes?: string;
      paymentReference?: string;
    },
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  }> {
    const result = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    };

    this.logger.log(`Batch processing ${ids.length} payrolls for payment`);

    // Process each payroll individually
    for (const id of ids) {
      result.processed++;
      try {
        await this.markAsPaid(id, paymentDetails);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async getPayrollStats(
    startDate: string,
    endDate: string,
    departmentId?: number,
  ) {
    try {
      this.logger.debug(
        `Getting payroll stats for period ${startDate} to ${endDate}`,
      );

      // Create base query for payrolls within date range - sử dụng logic tương tự như findAll
      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department');

      // Parse dates
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Make sure endDate is set to the end of the day
      endDateObj.setHours(23, 59, 59, 999);

      this.logger.debug(
        `Using date range: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`,
      );

      // Sửa điều kiện truy vấn để khớp với findAll
      query.where(
        '(payroll.period_start BETWEEN :startDate AND :endDate OR payroll.period_end BETWEEN :startDate AND :endDate)',
        { startDate: startDateObj, endDate: endDateObj },
      );

      // Add department filter if specified
      if (departmentId) {
        query.andWhere('employee.department_id = :departmentId', {
          departmentId,
        });
      }

      // Log the generated SQL để debug
      const sqlString = query.getQueryAndParameters();
      this.logger.debug(`Generated stats query: ${JSON.stringify(sqlString)}`);

      // Get all payrolls matching criteria
      const payrolls = await query.getMany();
      this.logger.debug(
        `Found ${payrolls.length} payrolls for stats calculation`,
      );

      // Count unique employees
      const uniqueEmployeeIds = new Set<number>();
      payrolls.forEach((payroll) => {
        if (payroll.employee?.id) {
          uniqueEmployeeIds.add(payroll.employee.id);
        }
      });

      // Calculate aggregate stats
      const totalGrossPay = payrolls.reduce(
        (sum, p) => sum + (p.gross_pay || 0),
        0,
      );
      const totalNetPay = payrolls.reduce(
        (sum, p) => sum + (p.net_pay || 0),
        0,
      );

      // Count by status
      // Define the enum values as a const to use for type checking
      type PayrollStatus = 'draft' | 'finalized' | 'paid';

      const byStatus = {
        draft: payrolls.filter((p) => p.status === ('draft' as PayrollStatus))
          .length,
        finalized: payrolls.filter(
          (p) => p.status === ('finalized' as PayrollStatus),
        ).length,
        paid: payrolls.filter((p) => p.status === ('paid' as PayrollStatus))
          .length,
      };

      // Count by department
      const byDepartment: Record<string, number> = {};
      payrolls.forEach((payroll) => {
        const deptName = payroll.employee?.department?.name || 'Undefined';
        byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;
      });

      const result = {
        totalPayrolls: payrolls.length,
        totalEmployees: uniqueEmployeeIds.size,
        totalGrossPay,
        totalNetPay,
        byStatus,
        byDepartment,
      };

      this.logger.debug(`Stats result: ${JSON.stringify(result)}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting payroll stats: ${errorMessage}`);
      throw new Error(`Failed to get payroll statistics: ${errorMessage}`);
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
      this.logger.debug(
        `Getting payrolls for employee ${employeeId} from ${startDate} to ${endDate}`,
      );

      // Parse dates
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Make sure endDate is set to the end of the day
      endDateObj.setHours(23, 59, 59, 999);

      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role')
        .where('payroll.employee_id = :employeeId', { employeeId })
        .andWhere(
          '(payroll.period_start BETWEEN :startDate AND :endDate OR payroll.period_end BETWEEN :startDate AND :endDate)',
          { startDate: startDateObj, endDate: endDateObj },
        )
        .orderBy('payroll.period_start', 'DESC');

      const payrolls = await query.getMany();
      this.logger.debug(
        `Found ${payrolls.length} payrolls for employee ${employeeId}`,
      );

      return payrolls;
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
      this.logger.debug(
        `Getting payrolls for department ${departmentId} from ${startDate} to ${endDate}`,
      );

      // Parse dates
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Make sure endDate is set to the end of the day
      endDateObj.setHours(23, 59, 59, 999);

      const query = this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role')
        .where('employee.department_id = :departmentId', { departmentId })
        .andWhere(
          '(payroll.period_start BETWEEN :startDate AND :endDate OR payroll.period_end BETWEEN :startDate AND :endDate)',
          { startDate: startDateObj, endDate: endDateObj },
        )
        .orderBy('payroll.period_start', 'DESC');

      const payrolls = await query.getMany();
      this.logger.debug(
        `Found ${payrolls.length} payrolls for department ${departmentId}`,
      );

      return payrolls;
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
  ): Promise<{
    attendances: Attendance[];
    payrolls: Payroll[];
    employeeShifts: EmployeeShiftWithRelations[];
    summary: {
      totalWorkingDays: number;
      totalWorkingHours: number;
      presentCount: number;
      lateCount: number;
      earlyLeaveCount: number;
      absentCount: number;
      onLeaveCount: number;
      pendingCount: number;
      totalScheduledShifts: number;
      completedShifts: number;
      missedShifts: number;
      averageHoursPerDay?: number;
      estimatedSalary?: number;
    };
    dailyData: Array<{
      date: string;
      working_hours: number;
      status: AttendanceStatus;
      daily_pay: number;
      shift_code?: string;
      shift_name?: string;
      shift_time?: string;
    }>;
  }> {
    try {
      // Lấy dữ liệu điểm danh của nhân viên trong khoảng thời gian
      const attendances = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoinAndSelect('attendance.employee', 'employee')
        .leftJoinAndSelect('attendance.employeeShift', 'employeeShift')
        .leftJoinAndSelect('employeeShift.shift', 'shift')
        .where('attendance.employee_id = :employeeId', { employeeId })
        .andWhere('attendance.date >= :startDate', { startDate })
        .andWhere('attendance.date <= :endDate', { endDate })
        .orderBy('attendance.date', 'ASC')
        .getMany();

      // Lấy dữ liệu ca làm việc của nhân viên trong khoảng thời gian
      const employeeShiftsRepo = this.dataSource.getRepository(EmployeeShift);
      const employeeShifts = (await employeeShiftsRepo
        .createQueryBuilder('employeeShift')
        .leftJoinAndSelect('employeeShift.shift', 'shift')
        .where('employeeShift.employee_id = :employeeId', { employeeId })
        .andWhere('employeeShift.date >= :startDate', { startDate })
        .andWhere('employeeShift.date <= :endDate', { endDate })
        .orderBy('employeeShift.date', 'ASC')
        .getMany()) as EmployeeShiftWithRelations[];

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

      // Lấy cấu hình lương của nhân viên
      let salaryConfig: SalaryConfig;
      try {
        salaryConfig =
          await this.salaryConfigService.getEmployeeSalaryConfig(employeeId);
      } catch {
        // Nếu không có cấu hình, tạo một đối tượng mặc định
        salaryConfig = {
          id: 0,
          department_id: 0,
          role_id: 0,
          salary_type: SalaryType.MONTHLY,
          base_salary: 0,
          hourly_rate: 0,
          shift_rate: 0,
          overtime_multiplier: 1.5,
          night_shift_multiplier: 1.3,
          holiday_multiplier: 2,
          meal_allowance: 0,
          transport_allowance: 0,
          housing_allowance: 0,
          position_allowance: 0,
          responsibility_allowance: 0,
          phone_allowance: 0,
          attendance_bonus: 0,
          tax_rate: 0.1,
          insurance_rate: 0.105,
          standard_hours_per_day: 8,
          standard_days_per_month: 22,
          meal_allowance_tax_threshold: 730000,
          phone_allowance_tax_threshold: 1000000,
          is_active: true,
          description: '',
          created_at: new Date(),
          updated_at: new Date(),
          // Use empty objects with type casting
          department: {} as Department,
          role: {} as RoleEmployee,
        };
      }

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
        totalScheduledShifts: number;
        completedShifts: number;
        missedShifts: number;
        averageHoursPerDay?: number;
        estimatedSalary?: number;
      } = {
        totalWorkingDays: attendances.length,
        totalWorkingHours: attendances.reduce(
          (sum, att) => sum + (Number(att.working_hours) || 0),
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
        totalScheduledShifts: employeeShifts.length,
        completedShifts: employeeShifts.filter(
          (shift) => shift.status === 'completed',
        ).length,
        missedShifts: employeeShifts.filter(
          (shift) => shift.status === 'missed',
        ).length,
      };

      // Tính giờ làm việc trung bình mỗi ngày
      summary.averageHoursPerDay =
        summary.totalWorkingDays > 0
          ? summary.totalWorkingHours / summary.totalWorkingDays
          : summary.totalWorkingHours > 0
            ? summary.totalWorkingHours
            : 0;

      // Ước tính lương dựa trên số giờ làm việc và cấu hình lương
      let estimatedSalary = 0;

      // Tạo một pseudo payrollDto để sử dụng phương thức tính lương
      const pseudoPayrollDto: CreatePayrollDto = {
        employee_id: employeeId,
        period_start: startDate,
        period_end: endDate,
        period_type: PayrollPeriodType.MONTHLY,
        status: PayrollStatus.DRAFT,
      };

      // Tính lương ước tính sử dụng phương thức tính lương hiện có
      try {
        const approvedAttendances = attendances.filter(
          (att) => att.status === AttendanceStatus.APPROVED,
        );

        // Nếu không có dữ liệu chấm công được duyệt, vẫn đảm bảo tính lương dựa trên cấu hình
        if (approvedAttendances.length === 0 && summary.totalWorkingHours > 0) {
          // Tạo một attendance giả để có thể tính lương
          const mockAttendance = new Attendance();
          mockAttendance.working_hours = summary.totalWorkingHours;
          mockAttendance.overtime_hours = 0;
          mockAttendance.night_shift_hours = 0;
          mockAttendance.holiday_hours = 0;
          approvedAttendances.push(mockAttendance);
        }

        const periodDays =
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;

        const salaryCalculation = this.calculateSalaryByType(
          salaryConfig,
          approvedAttendances,
          periodDays,
          pseudoPayrollDto,
        );

        // Tính tổng phụ cấp
        const totalAllowances =
          (salaryConfig.meal_allowance || 0) +
          (salaryConfig.transport_allowance || 0) +
          (salaryConfig.housing_allowance || 0) +
          (salaryConfig.position_allowance || 0) +
          (salaryConfig.attendance_bonus || 0);

        // Tính tổng lương ước tính
        estimatedSalary =
          salaryCalculation.normalSalary +
          salaryCalculation.overtimePay +
          salaryCalculation.nightShiftPay +
          salaryCalculation.holidayPay +
          totalAllowances;
      } catch {
        // Nếu có lỗi, vẫn đảm bảo có giá trị ước tính
        if (payrolls.length > 0) {
          const latestPayroll = payrolls.sort(
            (a, b) =>
              new Date(b.period_end).getTime() -
              new Date(a.period_end).getTime(),
          )[0];

          // Nếu có bảng lương, sử dụng để ước tính
          const dailyRate = latestPayroll.gross_pay / 30; // Giả sử tháng có 30 ngày
          estimatedSalary = dailyRate * Math.max(summary.totalWorkingDays, 1);
        } else if (salaryConfig) {
          // Nếu có cấu hình lương, sử dụng để ước tính
          switch (salaryConfig.salary_type) {
            case SalaryType.MONTHLY: {
              const dailyRate =
                salaryConfig.base_salary /
                (salaryConfig.standard_days_per_month || 22);
              estimatedSalary =
                dailyRate * Math.max(summary.totalWorkingDays, 1);
              break;
            }
            case SalaryType.HOURLY: {
              estimatedSalary =
                (salaryConfig.hourly_rate || 0) *
                Math.max(summary.totalWorkingHours, 1);
              break;
            }
            case SalaryType.SHIFT: {
              const shifts = Math.ceil(
                summary.totalWorkingHours /
                  (salaryConfig.standard_hours_per_day || 8),
              );
              estimatedSalary =
                (salaryConfig.shift_rate || 0) * Math.max(shifts, 1);
              break;
            }
          }
        }
      }

      summary.estimatedSalary = estimatedSalary > 0 ? estimatedSalary : 0;

      // Tạo dữ liệu hàng ngày để hiển thị biểu đồ tương quan
      const dailyData: Array<{
        date: string;
        working_hours: number;
        status: AttendanceStatus;
        daily_pay: number;
        shift_code?: string;
        shift_name?: string;
        shift_time?: string;
      }> = [];

      // Map để theo dõi ca làm việc theo ngày
      const shiftsMap: Record<string, EmployeeShiftWithRelations[]> = {};

      // Populate the shifts map
      employeeShifts.forEach((shift) => {
        const dateStr = new Date(shift.date).toISOString().slice(0, 10);
        if (!shiftsMap[dateStr]) {
          shiftsMap[dateStr] = [];
        }
        shiftsMap[dateStr].push(shift);
      });

      attendances.forEach((att) => {
        const date = new Date(att.date);
        const dateStr = date.toISOString().slice(0, 10);

        // Tính lương ước tính hàng ngày
        let dailyPay = 0;

        // Nếu có cấu hình lương, sử dụng để ước tính
        if (salaryConfig) {
          switch (salaryConfig.salary_type) {
            case SalaryType.MONTHLY: {
              const dailyRate =
                salaryConfig.base_salary /
                (salaryConfig.standard_days_per_month || 22);
              const hourlyRate =
                dailyRate / (salaryConfig.standard_hours_per_day || 8);
              dailyPay = hourlyRate * (Number(att.working_hours) || 0);
              break;
            }
            case SalaryType.HOURLY: {
              dailyPay =
                (salaryConfig.hourly_rate || 0) *
                (Number(att.working_hours) || 0);
              break;
            }
            case SalaryType.SHIFT: {
              const shifts = Math.ceil(
                (Number(att.working_hours) || 0) /
                  (salaryConfig.standard_hours_per_day || 8),
              );
              dailyPay = (salaryConfig.shift_rate || 0) * Math.max(shifts, 0);
              break;
            }
          }
        } else if (
          typeof summary.estimatedSalary === 'number' &&
          summary.estimatedSalary > 0 &&
          summary.totalWorkingDays > 0
        ) {
          // Nếu không có cấu hình lương, phân bổ lương ước tính theo ngày
          dailyPay = summary.estimatedSalary / summary.totalWorkingDays;
        }

        // Lấy thông tin ca làm việc
        const dayShifts = shiftsMap[dateStr] || [];
        const shiftInfo = dayShifts.length > 0 ? dayShifts[0] : null;

        dailyData.push({
          date: dateStr,
          working_hours: Number(att.working_hours) || 0,
          status: att.status,
          daily_pay: Math.max(dailyPay, 0),
          shift_code: shiftInfo?.schedule_code,
          shift_name: shiftInfo?.shift?.name,
          shift_time: shiftInfo?.shift
            ? `${shiftInfo.shift.start_time}-${shiftInfo.shift.end_time}`
            : undefined,
        });
      });

      return {
        attendances,
        payrolls,
        employeeShifts,
        summary,
        dailyData,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error getting attendance-payroll integration: ${error instanceof Error ? error.message : String(error)}`,
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

  /**
   * Tự động tạo bảng lương cho nhiều nhân viên dựa trên dữ liệu chấm công
   * @param periodStartDate Ngày bắt đầu kỳ lương
   * @param periodEndDate Ngày kết thúc kỳ lương
   * @param periodType Loại kỳ lương (monthly, biweekly, etc)
   * @param employeeIds Danh sách ID nhân viên (nếu rỗng, sẽ tạo cho tất cả nhân viên có dữ liệu chấm công)
   * @param departmentId Lọc theo phòng ban nếu có
   * @param createdBy ID người tạo
   * @returns Kết quả tạo bảng lương
   */
  async generatePayrolls(
    periodStartDate: string,
    periodEndDate: string,
    periodType: PayrollPeriodType,
    employeeIds?: number[],
    departmentId?: number,
    createdBy?: number,
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ employeeId: number; error: string }>;
    payrolls: Payroll[];
  }> {
    const result = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as Array<{ employeeId: number; error: string }>,
      payrolls: [] as Payroll[],
    };

    try {
      // 1. Xác định danh sách nhân viên cần tạo bảng lương
      let employees: Employee[] = [];

      // Nếu chỉ định danh sách employeeIds
      if (employeeIds && employeeIds.length > 0) {
        employees = await this.employeeRepository.find({
          where: { id: In(employeeIds) },
          relations: ['department', 'role'],
        });
      }
      // Nếu chỉ định departmentId
      else if (departmentId) {
        employees = await this.employeeRepository.find({
          where: { department: { id: departmentId } },
          relations: ['department', 'role'],
        });
      }
      // Nếu không chỉ định, lấy tất cả nhân viên có dữ liệu chấm công trong kỳ
      else {
        // Lấy danh sách nhân viên có dữ liệu chấm công trong kỳ
        const attendances = await this.attendanceRepository.find({
          where: {
            date: Between(new Date(periodStartDate), new Date(periodEndDate)),
            status: AttendanceStatus.APPROVED,
            is_processed: false, // Chỉ lấy các chấm công chưa được xử lý
          },
          select: ['employee_id'],
        });

        // Danh sách ID nhân viên không trùng lặp
        const uniqueEmployeeIds = [
          ...new Set(attendances.map((a) => a.employee_id)),
        ];

        if (uniqueEmployeeIds.length > 0) {
          employees = await this.employeeRepository.find({
            where: { id: In(uniqueEmployeeIds) },
            relations: ['department', 'role'],
          });
        }
      }

      result.total = employees.length;

      // 2. Tạo bảng lương cho từng nhân viên
      for (const employee of employees) {
        try {
          // Kiểm tra xem đã có bảng lương cho nhân viên này trong kỳ chưa
          const existingPayroll = await this.payrollRepository.findOne({
            where: {
              employee_id: employee.id,
              period_start: Between(
                new Date(periodStartDate),
                new Date(periodEndDate),
              ),
              period_end: Between(
                new Date(periodStartDate),
                new Date(periodEndDate),
              ),
            },
          });

          if (existingPayroll) {
            throw new Error(
              `Đã tồn tại bảng lương cho nhân viên ${employee.name} trong kỳ này`,
            );
          }

          // Tạo dữ liệu cho bảng lương
          const payrollDto: CreatePayrollDto = {
            employee_id: employee.id,
            period_start: periodStartDate,
            period_end: periodEndDate,
            period_type: periodType,
            status: PayrollStatus.DRAFT,
            created_by: createdBy,
          };

          // Gọi hàm tạo bảng lương
          const payroll = await this.create(payrollDto);
          result.success++;
          result.payrolls.push(payroll);
        } catch (error) {
          result.failed++;
          result.errors.push({
            employeeId: employee.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        `Không thể tạo bảng lương tự động: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
