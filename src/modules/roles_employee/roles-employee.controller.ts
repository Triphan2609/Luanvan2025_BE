import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { RolesEmployeeService } from './roles-employee.service';
import { CreateRoleEmployeeDto } from './dto/create-role-employee.dto';
import { UpdateRoleEmployeeDto } from './dto/update-role-employee.dto';
import { Public } from '../auth/guards/public.decorator';

@Public()
@Controller('roles-employee')
export class RolesEmployeeController {
  constructor(private readonly rolesEmployeeService: RolesEmployeeService) {}

  @Post()
  create(@Body() createRoleEmployeeDto: CreateRoleEmployeeDto) {
    return this.rolesEmployeeService.create(createRoleEmployeeDto);
  }

  @Get()
  findAll() {
    return this.rolesEmployeeService.findAll();
  }

  @Get('by-department/:id')
  findByDepartment(@Param('id', ParseIntPipe) id: number) {
    return this.rolesEmployeeService.findByDepartment(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.rolesEmployeeService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateRoleEmployeeDto: UpdateRoleEmployeeDto,
  ) {
    return this.rolesEmployeeService.update(id, updateRoleEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.rolesEmployeeService.remove(id);
  }

  @Get(':id/employee-count')
  getEmployeeCount(@Param('id') id: number) {
    return this.rolesEmployeeService.getEmployeeCount(id);
  }
}
