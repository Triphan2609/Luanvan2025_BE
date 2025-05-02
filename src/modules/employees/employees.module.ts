import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './entities/employee.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConfigModule } from '@nestjs/config';
import { DepartmentsModule } from '../departments/departments.module';
import { RolesEmployeeModule } from '../roles_employee/roles-employee.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    ConfigModule,
    DepartmentsModule,
    RolesEmployeeModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const timestamp = Date.now().toString().slice(-6);
          const random = Math.round(Math.random() * 999);
          const name = `emp_${timestamp}${random}${extname(file.originalname)}`;
          callback(null, name);
        },
      }),
    }),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
