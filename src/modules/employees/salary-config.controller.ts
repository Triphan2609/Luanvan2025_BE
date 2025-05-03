import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  ParseIntPipe,
  Logger,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { SalaryConfigService } from './salary-config.service';
import { CreateSalaryConfigDto } from './dto/create-salary-config.dto';
import { QuerySalaryConfigDto } from './dto/query-salary-config.dto';
import { Public } from '../auth/guards/public.decorator';
import { SalaryType } from './entities/salary-config.entity';

@Controller('salary-configs')
@Public()
export class SalaryConfigController {
  private readonly logger = new Logger(SalaryConfigController.name);

  constructor(private readonly salaryConfigService: SalaryConfigService) {}

  @Get('types')
  getSalaryTypes() {
    this.logger.debug('Getting salary types');
    return {
      types: Object.values(SalaryType),
      labels: {
        [SalaryType.MONTHLY]: 'Lương tháng',
        [SalaryType.HOURLY]: 'Lương giờ',
        [SalaryType.SHIFT]: 'Lương ca',
      },
    };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    this.logger.debug(`Finding salary config for employee: ${employeeId}`);
    return this.salaryConfigService.getEmployeeSalaryConfig(employeeId);
  }

  @Get('department/:departmentId/role/:roleId')
  async findByDepartmentAndRole(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    this.logger.debug(
      `Finding salary config for department ${departmentId} and role ${roleId}`,
    );
    return this.salaryConfigService.findByDepartmentAndRole(
      departmentId,
      roleId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSalaryConfigDto: CreateSalaryConfigDto) {
    this.logger.debug(
      `Creating salary config: ${JSON.stringify(createSalaryConfigDto)}`,
    );
    return this.salaryConfigService.create(createSalaryConfigDto);
  }

  @Get()
  async findAll(@Query() queryDto: QuerySalaryConfigDto) {
    this.logger.debug(`Received query parameters: ${JSON.stringify(queryDto)}`);

    // Validate salary_type if present
    if (queryDto.salary_type && typeof queryDto.salary_type === 'string') {
      const validSalaryTypes = Object.values(SalaryType);
      if (!validSalaryTypes.includes(queryDto.salary_type)) {
        throw new BadRequestException(
          `Invalid salary type. Valid values are: ${validSalaryTypes.join(', ')}`,
        );
      }
      // The type is valid, we can continue processing
    }

    return this.salaryConfigService.findAll(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.debug(`Finding salary config with ID: ${id}`);
    return this.salaryConfigService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalaryConfigDto: CreateSalaryConfigDto,
  ) {
    this.logger.debug(
      `Updating salary config ${id}: ${JSON.stringify(updateSalaryConfigDto)}`,
    );
    return this.salaryConfigService.update(id, updateSalaryConfigDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('is_active') isActive: boolean,
  ) {
    this.logger.debug(`Updating salary config ${id} status to: ${isActive}`);
    return this.salaryConfigService.activate(id, isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.debug(`Removing salary config with ID: ${id}`);
    return this.salaryConfigService.remove(id);
  }
}
