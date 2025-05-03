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
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { Public } from '../auth/guards/public.decorator';
import { PayrollPeriodType } from './entities/payroll.entity';
import {
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

import { Response } from 'express';

// Add this DTO for handling payment requests
class ProcessPaymentDto {
  paymentDate?: Date;
  notes?: string;
  paymentReference?: string;
}

// Add this DTO for batch processing payments
class BatchProcessPaymentDto {
  ids: number[];
  paymentDate?: Date;
  notes?: string;
  paymentReference?: string;
}

// Add this DTO for batch generating payrolls
class GeneratePayrollsDto {
  @IsNotEmpty()
  @IsDateString()
  period_start: string;

  @IsNotEmpty()
  @IsDateString()
  period_end: string;

  @IsNotEmpty()
  @IsEnum(PayrollPeriodType)
  period_type: PayrollPeriodType;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  employee_ids?: number[];

  @IsOptional()
  @IsNumber()
  department_id?: number;

  @IsOptional()
  @IsNumber()
  created_by?: number;
}

@Controller('payrolls')
@Public()
export class PayrollController {
  private readonly logger = new Logger(PayrollController.name);

  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  create(@Body() createPayrollDto: CreatePayrollDto) {
    // Ensure employee_id is a number
    if (createPayrollDto.employee_id) {
      createPayrollDto.employee_id = +createPayrollDto.employee_id;

      // Validate it's a valid number
      if (isNaN(createPayrollDto.employee_id)) {
        this.logger.error(
          `Invalid employee_id: ${createPayrollDto.employee_id}`,
        );
        throw new Error('Employee ID must be a valid number');
      }
    }

    // Validate and sanitize all numeric values in allowances and deductions
    if (createPayrollDto.allowances) {
      for (const key in createPayrollDto.allowances) {
        if (createPayrollDto.allowances[key] !== undefined) {
          createPayrollDto.allowances[key] = Number(
            createPayrollDto.allowances[key],
          );
          if (isNaN(createPayrollDto.allowances[key])) {
            createPayrollDto.allowances[key] = 0;
          }
        }
      }
    }

    if (createPayrollDto.deductions) {
      for (const key in createPayrollDto.deductions) {
        if (createPayrollDto.deductions[key] !== undefined) {
          createPayrollDto.deductions[key] = Number(
            createPayrollDto.deductions[key],
          );
          if (isNaN(createPayrollDto.deductions[key])) {
            createPayrollDto.deductions[key] = 0;
          }
        }
      }
    }

    // Handle other numeric fields
    if (createPayrollDto.base_salary !== undefined) {
      createPayrollDto.base_salary = Number(createPayrollDto.base_salary);
      if (isNaN(createPayrollDto.base_salary)) {
        createPayrollDto.base_salary = undefined;
      }
    }

    if (createPayrollDto.salary_config_id !== undefined) {
      createPayrollDto.salary_config_id = Number(
        createPayrollDto.salary_config_id,
      );
      if (isNaN(createPayrollDto.salary_config_id)) {
        createPayrollDto.salary_config_id = undefined;
      }
    }

    this.logger.debug(
      'Processed payroll data:',
      JSON.stringify(createPayrollDto),
    );

    return this.payrollService.create(createPayrollDto);
  }

  @Get()
  findAll(@Query() queryDto: QueryPayrollDto) {
    return this.payrollService.findAll(queryDto);
  }

  @Get('stats')
  getPayrollStats(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('department_id') departmentId?: number,
  ) {
    return this.payrollService.getPayrollStats(
      startDate,
      endDate,
      departmentId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePayrollStatusDto,
  ) {
    return this.payrollService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.remove(id);
  }

  @Get('employee/:employeeId')
  getPayrollsByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.payrollService.getPayrollsByEmployee(
      employeeId,
      startDate,
      endDate,
    );
  }

  @Get('department/:departmentId')
  getPayrollsByDepartment(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.payrollService.getPayrollsByDepartment(
      departmentId,
      startDate,
      endDate,
    );
  }

  @Get('comparison')
  getPayrollComparison(
    @Query('period_start_1') periodStart1: string,
    @Query('period_end_1') periodEnd1: string,
    @Query('period_start_2') periodStart2: string,
    @Query('period_end_2') periodEnd2: string,
    @Query('department_id', ParseIntPipe) departmentId?: number,
  ) {
    return this.payrollService.getPayrollComparison(
      periodStart1,
      periodEnd1,
      periodStart2,
      periodEnd2,
      departmentId,
    );
  }

  @Get('trends')
  getPayrollTrends(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('group_by') groupBy: 'month' | 'week' | 'day',
    @Query('department_id', ParseIntPipe) departmentId?: number,
  ) {
    return this.payrollService.getPayrollTrends(
      startDate,
      endDate,
      groupBy,
      departmentId,
    );
  }

  @Get('attendance-integration/:employeeId')
  getAttendanceIntegration(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.payrollService.getAttendanceIntegration(
      employeeId,
      startDate,
      endDate,
    );
  }

  @Post('report/:format')
  async generateReport(
    @Param('format') format: string,
    @Body() filters: any,
    @Res() res: Response,
  ) {
    const report = await this.payrollService.generateReport(format, filters);

    if (format === 'pdf' || format === 'excel') {
      res.setHeader(
        'Content-Type',
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=payroll-report.${format}`,
      );
      return res.send(report);
    }

    return res.status(HttpStatus.OK).json(report);
  }

  // Add a new endpoint to mark a payroll as paid
  @Patch(':id/process-payment')
  async processPayment(
    @Param('id') id: string,
    @Body() processPaymentDto: ProcessPaymentDto,
  ) {
    return this.payrollService.markAsPaid(+id, processPaymentDto);
  }

  // Add a new endpoint for batch processing payments
  @Patch('batch-process-payment')
  async batchProcessPayment(@Body() batchProcessDto: BatchProcessPaymentDto) {
    return this.payrollService.batchMarkAsPaid(batchProcessDto.ids, {
      paymentDate: batchProcessDto.paymentDate,
      notes: batchProcessDto.notes,
      paymentReference: batchProcessDto.paymentReference,
    });
  }

  @Post('generate-batch')
  async generatePayrolls(@Body() generateDto: GeneratePayrollsDto) {
    return this.payrollService.generatePayrolls(
      generateDto.period_start,
      generateDto.period_end,
      generateDto.period_type,
      generateDto.employee_ids,
      generateDto.department_id,
      generateDto.created_by,
    );
  }
}
