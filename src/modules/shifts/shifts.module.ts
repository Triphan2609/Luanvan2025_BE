import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { EmployeeShiftsService } from './employee-shifts.service';
import { EmployeeShiftsController } from './employee_shifts.controller';
import { Shift } from './entities/shift.entity';
import { EmployeeShift } from './entities/employee-shift.entity';
import { Attendance } from './entities/attendance.entity';
import { Employee } from '../employees/entities/employee.entity';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, EmployeeShift, Attendance, Employee]),
  ],
  controllers: [
    ShiftsController,
    EmployeeShiftsController,
    AttendancesController,
  ],
  providers: [ShiftsService, EmployeeShiftsService, AttendancesService],
  exports: [ShiftsService, EmployeeShiftsService, AttendancesService],
})
export class ShiftsModule {}
