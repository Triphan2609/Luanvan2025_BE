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
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { Public } from '../auth/guards/public.decorator';

import { Response } from 'express';

@Controller('payrolls')
@Public()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  create(@Body() createPayrollDto: CreatePayrollDto) {
    return this.payrollService.create(createPayrollDto);
  }

  @Get()
  findAll(@Query() queryDto: QueryPayrollDto) {
    return this.payrollService.findAll(queryDto);
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

  @Get('stats')
  getPayrollStats(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('department_id', ParseIntPipe) departmentId?: number,
  ) {
    return this.payrollService.getPayrollStats(
      startDate,
      endDate,
      departmentId,
    );
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
}
