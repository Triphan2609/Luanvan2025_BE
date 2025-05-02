import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftsService } from './shifts.service';
import { EmployeeShiftsService } from './employee-shifts.service';
import { ShiftsController } from './shifts.controller';
import { EmployeeShiftsController } from './employee_shifts.controller';
import { Shift } from './entities/shift.entity';
import { EmployeeShift } from './entities/employee-shift.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, EmployeeShift, Employee])],
  controllers: [ShiftsController, EmployeeShiftsController],
  providers: [ShiftsService, EmployeeShiftsService],
  exports: [ShiftsService, EmployeeShiftsService],
})
export class ShiftsModule {}
