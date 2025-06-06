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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Public } from '../auth/guards/public.decorator';

@Public()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get('by-branch/:id')
  findByBranch(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findByBranch(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.departmentsService.remove(id);
  }

  @Get(':id/employee-count')
  getEmployeeCount(@Param('id') id: number) {
    return this.departmentsService.getEmployeeCount(id);
  }
}
