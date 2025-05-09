import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmployeeShiftsService } from './employee-shifts.service';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { UpdateEmployeeShiftDto } from './dto/update-employee-shift.dto';
import { ScheduleStatus } from './entities/employee-shift.entity';
import { Public } from '../auth/guards/public.decorator';

@Public()
@Controller('employee-shifts')
export class EmployeeShiftsController {
  constructor(private readonly employeeShiftsService: EmployeeShiftsService) {}

  @Post()
  create(@Body() createEmployeeShiftDto: CreateEmployeeShiftDto) {
    return this.employeeShiftsService.create(createEmployeeShiftDto);
  }

  @Post('bulk')
  createBulk(@Body() createEmployeeShiftDtos: CreateEmployeeShiftDto[]) {
    return this.employeeShiftsService.bulkCreate(createEmployeeShiftDtos);
  }

  @Get()
  findAll(
    @Query('employeeId') employeeId?: number,
    @Query('shiftId') shiftId?: number,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: ScheduleStatus,
    @Query('department_id') department_id?: number,
    @Query('branch_id') branch_id?: number,
  ) {
    return this.employeeShiftsService.findAll({
      employeeId,
      shiftId,
      date,
      startDate,
      endDate,
      status,
      department_id,
      branch_id,
    });
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.employeeShiftsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeShiftsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeShiftDto: UpdateEmployeeShiftDto,
  ) {
    return this.employeeShiftsService.update(+id, updateEmployeeShiftDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ScheduleStatus,
  ) {
    return this.employeeShiftsService.updateStatus(+id, status);
  }

  @Patch('bulk-status')
  async bulkUpdateStatus(
    @Body() data: { ids: number[]; status: ScheduleStatus },
  ) {
    return this.employeeShiftsService.bulkUpdateStatus(data.ids, data.status);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bulkDelete(@Body() data: { ids: number[] }) {
    return this.employeeShiftsService.bulkDelete(data.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.employeeShiftsService.remove(+id);
  }
}
