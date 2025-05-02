import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesEmployeeService } from './roles-employee.service';
import { RolesEmployeeController } from './roles-employee.controller';
import { RoleEmployee } from './entities/role-employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEmployee])],
  controllers: [RolesEmployeeController],
  providers: [RolesEmployeeService],
  exports: [RolesEmployeeService],
})
export class RolesEmployeeModule {}
