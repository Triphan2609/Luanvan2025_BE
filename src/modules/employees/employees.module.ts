import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { SalaryConfig } from './entities/salary-config.entity';
import { Payroll } from './entities/payroll.entity';
import { SalaryConfigService } from './salary-config.service';
import { SalaryConfigController } from './salary-config.controller';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Department } from '../departments/entities/department.entity';
import { RoleEmployee } from '../roles_employee/entities/role-employee.entity';
import { Attendance } from '../shifts/entities/attendance.entity';
import { ShiftsModule } from '../shifts/shifts.module';
import { DepartmentsModule } from '../departments/departments.module';
import { RolesEmployeeModule } from '../roles_employee/roles-employee.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      SalaryConfig,
      Payroll,
      Department,
      RoleEmployee,
      Attendance,
    ]),
    ShiftsModule,
    DepartmentsModule,
    RolesEmployeeModule,
  ],
  controllers: [EmployeesController, SalaryConfigController, PayrollController],
  providers: [EmployeesService, SalaryConfigService, PayrollService],
  exports: [EmployeesService, SalaryConfigService, PayrollService],
})
export class EmployeesModule {}
