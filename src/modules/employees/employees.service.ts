import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    private configService: ConfigService,
  ) {}

  create(createEmployeeDto: CreateEmployeeDto) {
    // Extract the department_id and role_id
    const { department_id, role_id, ...otherData } = createEmployeeDto;

    // Create the base employee object
    const employeeData = { ...otherData };

    // Set up relations correctly
    if (department_id !== undefined) {
      employeeData['department'] = { id: department_id };
    }

    if (role_id !== undefined) {
      employeeData['role'] = { id: role_id };
    }

    const employee = this.employeesRepository.create(employeeData);
    return this.employeesRepository.save(employee);
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: number;
    roleId?: number;
    status?: string;
  }) {
    try {
      const query = this.employeesRepository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.role', 'role');

      // Apply filters
      if (filters?.search) {
        query.andWhere(
          '(employee.name LIKE :search OR employee.email LIKE :search OR employee.phone LIKE :search OR employee.employee_code LIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      if (filters?.departmentId) {
        query.andWhere('employee.department_id = :departmentId', {
          departmentId: filters.departmentId,
        });
      }

      if (filters?.roleId) {
        query.andWhere('employee.role_id = :roleId', {
          roleId: filters.roleId,
        });
      }

      if (filters?.status) {
        query.andWhere('employee.status = :status', { status: filters.status });
      }

      // Add pagination if specified
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;

      // Get total count before applying pagination
      const total = await query.getCount();

      // Apply pagination
      if (page && limit) {
        query.skip((page - 1) * limit).take(limit);
      }

      // Get results
      const data = await query.getMany();

      // Return with pagination metadata
      return {
        data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding employees: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch employees');
    }
  }

  findOne(id: number) {
    return this.employeesRepository.findOne({
      where: { id },
      relations: ['department', 'role'],
    });
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    // Extract the department_id and role_id
    const { department_id, role_id, ...otherData } = updateEmployeeDto;

    // Create an object for direct database update
    const dataToUpdate = { ...otherData };

    // Manually handle relations if they are provided
    if (department_id !== undefined) {
      // TypeORM expects relation objects for relationships
      dataToUpdate['department'] = { id: department_id };
    }

    if (role_id !== undefined) {
      // TypeORM expects relation objects for relationships
      dataToUpdate['role'] = { id: role_id };
    }

    await this.employeesRepository.update(id, dataToUpdate);
    return this.findOne(id);
  }

  async remove(id: number) {
    const employee = await this.findOne(id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return await this.employeesRepository.remove(employee);
  }

  async uploadAvatar(file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const filename = file.filename;
    this.logger.log(`File uploaded: ${filename}`);

    // Kiểm tra file tồn tại
    const filePath = join(process.cwd(), 'uploads', filename);
    await fs.access(filePath).catch(() => {
      this.logger.error(`File not found at path: ${filePath}`);
      throw new Error('File upload failed');
    });

    // Sử dụng đường dẫn tương đối thay vì URL đầy đủ
    // Vì đã cấu hình static file serving với prefix /uploads
    const fileUrl = `/uploads/${filename}`;

    return {
      url: fileUrl,
      originalName: file.originalname,
      size: file.size,
    };
  }

  // Phương thức mới để xử lý base64 image
  async uploadBase64Image(base64Image: string) {
    try {
      // Xử lý chuỗi base64 (data:image/jpeg;base64,/9j/...)
      if (!base64Image) {
        throw new BadRequestException('Invalid base64 image data');
      }

      // Trích xuất thông tin từ chuỗi base64
      const matches = base64Image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new BadRequestException('Invalid base64 image format');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const extension = mimeType.split('/')[1];

      // Kiểm tra loại file hợp lệ
      if (!['jpeg', 'jpg', 'png', 'gif'].includes(extension)) {
        throw new BadRequestException('Unsupported file type');
      }

      // Kiểm tra kích thước ảnh (base64 length * 0.75 tương đương với kích thước bytes)
      const fileSize = base64Data.length * 0.75;
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (fileSize > maxSize) {
        throw new BadRequestException('Image size exceeds limit (5MB)');
      }

      // Tạo tên file ngẫu nhiên và thêm timestamp để đảm bảo tính duy nhất
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomString = Math.random().toString(36).substring(2, 10);
      const filename = `${timestamp}-${randomString}.${extension}`;
      const filePath = join(process.cwd(), 'uploads', filename);

      // Đảm bảo thư mục uploads tồn tại
      await fs.mkdir(join(process.cwd(), 'uploads'), { recursive: true });

      // Ghi file
      await fs.writeFile(filePath, base64Data, { encoding: 'base64' });

      // Trả về URL
      const fileUrl = `/uploads/${filename}`;
      return {
        url: fileUrl,
        originalName: filename,
        size: fileSize,
        type: mimeType,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing base64 image: ${errorMessage}`);
      throw new BadRequestException(
        `Failed to process base64 image: ${errorMessage}`,
      );
    }
  }

  async updateStatus(id: number, status: 'active' | 'on_leave' | 'inactive') {
    const employee = await this.findOne(id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    await this.employeesRepository.update(id, { status });
    return this.findOne(id);
  }

  async bulkUpdateStatus(
    ids: number[],
    status: 'active' | 'on_leave' | 'inactive',
  ) {
    try {
      // Validate that all employees exist
      const employees = await this.employeesRepository.find({
        where: { id: In(ids) }, // Use In operator for array of ids
      });

      if (employees.length !== ids.length) {
        const foundIds = employees.map((emp) => emp.id);
        const missingIds = ids.filter((id) => !foundIds.includes(+id));
        this.logger.warn(`Some employees not found: ${missingIds.join(', ')}`);
      }

      // Update status for all found employees
      const result = await this.employeesRepository.update(
        { id: In(employees.map((emp) => emp.id)) },
        { status },
      );

      return {
        success: true,
        message: `Updated status to ${status} for ${result.affected} employees`,
        affectedCount: result.affected,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating bulk status: ${errorMessage}`);
      throw new BadRequestException(
        `Failed to update employees status: ${errorMessage}`,
      );
    }
  }

  async bulkDelete(ids: number[]) {
    try {
      // Validate that all employees exist
      const employees = await this.employeesRepository.find({
        where: { id: In(ids) }, // Use In operator for array of ids
      });

      if (employees.length !== ids.length) {
        const foundIds = employees.map((emp) => emp.id);
        const missingIds = ids.filter((id) => !foundIds.includes(+id));
        this.logger.warn(`Some employees not found: ${missingIds.join(', ')}`);
      }

      // Delete all found employees
      const result = await this.employeesRepository.remove(employees);

      return {
        success: true,
        message: `Deleted ${result.length} employees successfully`,
        deletedCount: result.length,
        deletedEmployees: result,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error bulk deleting employees: ${errorMessage}`);
      throw new BadRequestException(
        `Failed to delete employees: ${errorMessage}`,
      );
    }
  }

  async getWorkHistory(id: number) {
    const employee = await this.findOne(id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    // TODO: Implement work history logic
    // For now, return mock data
    return [
      {
        id: 1,
        date: new Date(),
        shift: {
          start_time: '08:00',
          end_time: '17:00',
        },
        status: 'present',
        note: 'Làm việc bình thường',
      },
    ];
  }
}
