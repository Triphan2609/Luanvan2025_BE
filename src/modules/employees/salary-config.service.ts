import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryConfig, SalaryType } from './entities/salary-config.entity';
import { CreateSalaryConfigDto } from './dto/create-salary-config.dto';
import { QuerySalaryConfigDto } from './dto/query-salary-config.dto';
import { Department } from '../departments/entities/department.entity';
import { RoleEmployee } from '../roles_employee/entities/role-employee.entity';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class SalaryConfigService {
  private readonly logger = new Logger(SalaryConfigService.name);

  constructor(
    @InjectRepository(SalaryConfig)
    private salaryConfigRepository: Repository<SalaryConfig>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(RoleEmployee)
    private roleRepository: Repository<RoleEmployee>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(
    createSalaryConfigDto: CreateSalaryConfigDto,
  ): Promise<SalaryConfig> {
    // Validate department and role exist
    const department = await this.departmentRepository.findOne({
      where: { id: createSalaryConfigDto.department_id },
    });

    if (!department) {
      throw new NotFoundException(
        `Department with ID ${createSalaryConfigDto.department_id} not found`,
      );
    }

    const role = await this.roleRepository.findOne({
      where: { id: createSalaryConfigDto.role_id },
    });

    if (!role) {
      throw new NotFoundException(
        `Role with ID ${createSalaryConfigDto.role_id} not found`,
      );
    }

    // Log dữ liệu salary_type
    this.logger.debug(
      `Creating salary config with type: ${createSalaryConfigDto.salary_type}`,
    );

    // Đảm bảo salary_type là một trong các giá trị hợp lệ
    if (
      !Object.values(SalaryType).includes(
        createSalaryConfigDto.salary_type as any,
      )
    ) {
      this.logger.warn(
        `Invalid salary_type: ${createSalaryConfigDto.salary_type}, forcing to MONTHLY`,
      );
      createSalaryConfigDto.salary_type = SalaryType.MONTHLY;
    }

    // Kiểm tra tính hợp lệ của dữ liệu theo loại lương
    this.validateSalaryConfigByType(createSalaryConfigDto);

    // Check if config already exists for this department and role
    const existingConfig = await this.salaryConfigRepository.findOne({
      where: {
        department_id: createSalaryConfigDto.department_id,
        role_id: createSalaryConfigDto.role_id,
      },
    });

    if (existingConfig) {
      // Update existing config
      this.salaryConfigRepository.merge(existingConfig, createSalaryConfigDto);
      const savedConfig =
        await this.salaryConfigRepository.save(existingConfig);
      this.logger.debug(
        `Updated existing config, salary_type: ${savedConfig.salary_type}`,
      );
      return savedConfig;
    }

    // Create new config
    const salaryConfig = this.salaryConfigRepository.create(
      createSalaryConfigDto,
    );
    const savedConfig = await this.salaryConfigRepository.save(salaryConfig);
    this.logger.debug(
      `Created new config, salary_type: ${savedConfig.salary_type}`,
    );
    return savedConfig;
  }

  async findAll(queryDto: QuerySalaryConfigDto): Promise<SalaryConfig[]> {
    const where: {
      department_id?: number;
      role_id?: number;
      is_active?: boolean;
      salary_type?: SalaryType;
    } = {};

    if (queryDto.department_id) {
      where.department_id = queryDto.department_id;
    }

    if (queryDto.role_id) {
      where.role_id = queryDto.role_id;
    }

    if (queryDto.is_active !== undefined) {
      where.is_active = queryDto.is_active;
      this.logger.debug(
        `Is active filter applied with value: ${where.is_active}, type: ${typeof where.is_active}`,
      );
    }

    if (queryDto.salary_type) {
      where.salary_type = queryDto.salary_type;
      this.logger.debug(
        `Salary type filter applied with value: ${where.salary_type}`,
      );
    }

    this.logger.debug(
      `Finding salary configs with where clause: ${JSON.stringify(where)}`,
    );
    this.logger.debug(`Query parameters: ${JSON.stringify(queryDto)}`);

    const configs = await this.salaryConfigRepository.find({
      where,
      relations: ['department', 'role'],
      order: { department_id: 'ASC', role_id: 'ASC' },
    });

    this.logger.debug(`Found ${configs.length} salary configs with filters`);

    // Log salary types trong kết quả
    if (configs.length > 0) {
      this.logger.debug(`Sample salary_type values:`);
      configs.slice(0, 3).forEach((config, index) => {
        this.logger.debug(
          `Config ${index + 1} salary_type: ${config.salary_type}, type: ${typeof config.salary_type}`,
        );
      });
    }

    return configs;
  }

  async findOne(id: number): Promise<SalaryConfig> {
    const salaryConfig = await this.salaryConfigRepository.findOne({
      where: { id },
      relations: ['department', 'role'],
    });

    if (!salaryConfig) {
      throw new NotFoundException(`Salary config with ID ${id} not found`);
    }

    this.logger.debug(`Found salary config: ${JSON.stringify(salaryConfig)}`);
    this.logger.debug(
      `Config salary_type: ${salaryConfig.salary_type}, type: ${typeof salaryConfig.salary_type}`,
    );

    return salaryConfig;
  }

  async update(
    id: number,
    updateSalaryConfigDto: CreateSalaryConfigDto,
  ): Promise<SalaryConfig> {
    const salaryConfig = await this.findOne(id);

    // Validate department and role exist if they are being updated
    if (updateSalaryConfigDto.department_id) {
      const department = await this.departmentRepository.findOne({
        where: { id: updateSalaryConfigDto.department_id },
      });

      if (!department) {
        throw new NotFoundException(
          `Department with ID ${updateSalaryConfigDto.department_id} not found`,
        );
      }
    }

    if (updateSalaryConfigDto.role_id) {
      const role = await this.roleRepository.findOne({
        where: { id: updateSalaryConfigDto.role_id },
      });

      if (!role) {
        throw new NotFoundException(
          `Role with ID ${updateSalaryConfigDto.role_id} not found`,
        );
      }
    }

    // Kiểm tra tính hợp lệ của dữ liệu theo loại lương khi cập nhật
    const salaryTypeToValidate =
      updateSalaryConfigDto.salary_type || salaryConfig.salary_type;
    this.validateSalaryConfigByType({
      ...salaryConfig,
      ...updateSalaryConfigDto,
      salary_type: salaryTypeToValidate,
    });

    this.salaryConfigRepository.merge(salaryConfig, updateSalaryConfigDto);

    return this.salaryConfigRepository.save(salaryConfig);
  }

  async remove(id: number): Promise<void> {
    const salaryConfig = await this.findOne(id);
    await this.salaryConfigRepository.remove(salaryConfig);
  }

  async activate(id: number, isActive: boolean): Promise<SalaryConfig> {
    const salaryConfig = await this.findOne(id);

    salaryConfig.is_active = isActive;

    return this.salaryConfigRepository.save(salaryConfig);
  }

  async findByDepartmentAndRole(
    departmentId: number,
    roleId: number,
  ): Promise<SalaryConfig> {
    const salaryConfig = await this.salaryConfigRepository.findOne({
      where: {
        department_id: departmentId,
        role_id: roleId,
        is_active: true,
      },
    });

    if (!salaryConfig) {
      throw new NotFoundException(
        `No active salary config found for department ID ${departmentId} and role ID ${roleId}`,
      );
    }

    return salaryConfig;
  }

  /**
   * Lấy cấu hình lương hiện tại của một nhân viên
   */
  async getEmployeeSalaryConfig(employeeId: number): Promise<SalaryConfig> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['department', 'role'],
    });

    if (!employee) {
      throw new NotFoundException(
        `Không tìm thấy nhân viên với ID ${employeeId}`,
      );
    }

    if (!employee.department || !employee.role) {
      throw new BadRequestException(
        `Nhân viên với ID ${employeeId} chưa được phân công phòng ban hoặc chức vụ`,
      );
    }

    // Tìm cấu hình lương dựa trên phòng ban và chức vụ
    const salaryConfig = await this.salaryConfigRepository.findOne({
      where: {
        department_id: employee.department.id,
        role_id: employee.role.id,
        is_active: true,
      },
    });

    if (!salaryConfig) {
      throw new NotFoundException(
        `Không tìm thấy cấu hình lương đang hoạt động cho phòng ban ${employee.department.name} và chức vụ ${employee.role.name}`,
      );
    }

    return salaryConfig;
  }

  /**
   * Kiểm tra tính hợp lệ của dữ liệu dựa trên loại lương
   */
  private validateSalaryConfigByType(dto: CreateSalaryConfigDto): void {
    // Kiểm tra cho lương giờ
    if (dto.salary_type === SalaryType.HOURLY && !dto.hourly_rate) {
      throw new BadRequestException(
        'Mức lương giờ (hourly_rate) là bắt buộc khi chọn loại lương giờ',
      );
    }

    // Kiểm tra cho lương ca
    if (dto.salary_type === SalaryType.SHIFT && !dto.shift_rate) {
      throw new BadRequestException(
        'Mức lương ca (shift_rate) là bắt buộc khi chọn loại lương ca',
      );
    }

    // Đảm bảo các hệ số tăng ca, ca đêm và lễ có mặt và hợp lệ
    if (!dto.overtime_multiplier || dto.overtime_multiplier < 1) {
      dto.overtime_multiplier = 1.5; // Giá trị mặc định cho hệ số tăng ca
    }

    if (!dto.night_shift_multiplier || dto.night_shift_multiplier < 1) {
      dto.night_shift_multiplier = 1.3; // Giá trị mặc định cho hệ số ca đêm
    }

    if (!dto.holiday_multiplier || dto.holiday_multiplier < 1) {
      dto.holiday_multiplier = 2.0; // Giá trị mặc định cho hệ số ngày lễ
    }

    // Đảm bảo số giờ làm việc tiêu chuẩn mỗi ngày có giá trị hợp lệ
    if (
      !dto.standard_hours_per_day ||
      dto.standard_hours_per_day < 1 ||
      dto.standard_hours_per_day > 24
    ) {
      dto.standard_hours_per_day = 8; // Giá trị mặc định 8 giờ/ngày
    }

    // Đảm bảo số ngày làm việc tiêu chuẩn mỗi tháng có giá trị hợp lệ
    if (
      !dto.standard_days_per_month ||
      dto.standard_days_per_month < 1 ||
      dto.standard_days_per_month > 31
    ) {
      dto.standard_days_per_month = 22; // Giá trị mặc định 22 ngày/tháng
    }
  }
}
