import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { DepartmentsService } from '../departments/departments.service';
import { RolesEmployeeService } from '../roles_employee/roles-employee.service';
import { Public } from '../auth/guards/public.decorator';

@Public()
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly departmentsService: DepartmentsService,
    private readonly rolesService: RolesEmployeeService,
  ) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    // Chuyển đổi ngày tháng nếu là chuỗi
    if (
      createEmployeeDto.birthday &&
      typeof createEmployeeDto.birthday === 'string'
    ) {
      createEmployeeDto.birthday = new Date(createEmployeeDto.birthday);
    }

    if (
      createEmployeeDto.join_date &&
      typeof createEmployeeDto.join_date === 'string'
    ) {
      createEmployeeDto.join_date = new Date(createEmployeeDto.join_date);
    }

    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('department_id') department_id?: number,
    @Query('role_id') role_id?: number,
    @Query('branch_id') branch_id?: number,
    @Query('status') status?: string,
  ) {
    return this.employeesService.findAll({
      page,
      limit,
      search,
      department_id,
      role_id,
      branch_id,
      status,
    });
  }

  // Endpoints cho departments và roles đặt trước endpoint có tham số để ưu tiên khớp chúng trước
  @Get('departments')
  getDepartments() {
    return this.departmentsService.findAll();
  }

  @Get('roles')
  getRoles() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Kiểm tra xem id có phải là số hợp lệ không
    const employeeId = this.validateId(id);
    return this.employeesService.findOne(employeeId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    // Kiểm tra xem id có phải là số hợp lệ không
    const employeeId = this.validateId(id);

    // Chuyển đổi ngày tháng nếu là chuỗi
    if (
      updateEmployeeDto.birthday &&
      typeof updateEmployeeDto.birthday === 'string'
    ) {
      updateEmployeeDto.birthday = new Date(updateEmployeeDto.birthday);
    }

    if (
      updateEmployeeDto.join_date &&
      typeof updateEmployeeDto.join_date === 'string'
    ) {
      updateEmployeeDto.join_date = new Date(updateEmployeeDto.join_date);
    }

    return this.employeesService.update(employeeId, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // Kiểm tra xem id có phải là số hợp lệ không
    const employeeId = this.validateId(id);
    return this.employeesService.remove(employeeId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return this.employeesService.uploadAvatar(file);
  }

  @Post('upload-base64')
  uploadBase64Avatar(@Body('image') base64Image: string) {
    if (!base64Image) {
      throw new BadRequestException('No image data provided');
    }
    return this.employeesService.uploadBase64Image(base64Image);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'on_leave' | 'inactive',
  ) {
    // Kiểm tra xem id có phải là số hợp lệ không
    const employeeId = this.validateId(id);
    return this.employeesService.updateStatus(employeeId, status);
  }

  @Post('bulk/status')
  bulkUpdateStatus(
    @Body('ids') ids: number[],
    @Body('status') status: 'active' | 'on_leave' | 'inactive',
  ) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No employee IDs provided');
    }
    if (!status) {
      throw new BadRequestException('No status provided');
    }
    return this.employeesService.bulkUpdateStatus(ids, status);
  }

  @Post('bulk/delete')
  bulkDelete(@Body('ids') ids: number[]) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No employee IDs provided');
    }
    return this.employeesService.bulkDelete(ids);
  }

  @Get(':id/work-history')
  getWorkHistory(@Param('id') id: string) {
    // Kiểm tra xem id có phải là số hợp lệ không
    const employeeId = this.validateId(id);
    return this.employeesService.getWorkHistory(employeeId);
  }

  // Phương thức hỗ trợ để xác thực và chuyển đổi id
  private validateId(id: string): number {
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      throw new BadRequestException(`ID không hợp lệ: ${id}`);
    }

    return numericId;
  }
}
