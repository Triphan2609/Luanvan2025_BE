import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { BranchTypesService } from './branch-types.service';
import { CreateBranchTypeDto } from './dto/create-branch-type.dto';
import { UpdateBranchTypeDto } from './dto/update-branch-type.dto';

@Controller('branch-types')
export class BranchTypesController {
  constructor(private readonly branchTypesService: BranchTypesService) {}

  @Get()
  async findAll() {
    return this.branchTypesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.branchTypesService.findOne(id);
  }

  @Post()
  async create(@Body() createBranchTypeDto: CreateBranchTypeDto) {
    return this.branchTypesService.create(createBranchTypeDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() updateBranchTypeDto: UpdateBranchTypeDto,
  ) {
    return this.branchTypesService.update(id, updateBranchTypeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.branchTypesService.remove(id);
  }
}
