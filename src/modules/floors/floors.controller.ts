import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { Floor } from './entities/floor.entity';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  create(@Body() createFloorDto: CreateFloorDto): Promise<Floor> {
    return this.floorsService.create(createFloorDto);
  }

  @Get()
  findAll(@Query('branchId') branchId?: number): Promise<Floor[]> {
    return this.floorsService.findAll(branchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Floor> {
    return this.floorsService.findOne(id);
  }

  @Get(':id/details')
  getFloorDetails(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.floorsService.getFloorDetails(id);
  }

  @Get('branch/:branchId')
  getFloorsByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
  ): Promise<Floor[]> {
    return this.floorsService.getFloorsByBranch(branchId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFloorDto: UpdateFloorDto,
  ): Promise<Floor> {
    return this.floorsService.update(id, updateFloorDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.floorsService.remove(id);
  }
}
