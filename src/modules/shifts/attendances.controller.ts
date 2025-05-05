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
  Put,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { Public } from '../auth/guards/public.decorator';

@Controller('attendances')
@Public()
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendancesService.create(createAttendanceDto);
  }

  @Get()
  findAll(@Query() queryDto: QueryAttendanceDto) {
    return this.attendancesService.findAll(queryDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendancesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendancesService.update(id, updateAttendanceDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateAttendanceStatusDto,
  ) {
    return this.attendancesService.updateStatus(id, updateStatusDto);
  }

  @Patch(':id/checkout')
  updateCheckOut(
    @Param('id', ParseIntPipe) id: number,
    @Body('check_out') checkOut: string,
  ) {
    return this.attendancesService.updateCheckOut(id, checkOut);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendancesService.remove(id);
  }

  @Get('stats')
  getAttendanceStats(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('department_id') departmentId?: number,
    @Query('branch_id') branchId?: number,
  ) {
    // Convert strings to numbers if provided
    const deptId = departmentId
      ? parseInt(departmentId.toString(), 10)
      : undefined;
    const brId = branchId ? parseInt(branchId.toString(), 10) : undefined;

    return this.attendancesService.getAttendanceStats(
      startDate,
      endDate,
      deptId,
      brId,
    );
  }
}
