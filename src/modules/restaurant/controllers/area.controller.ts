import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AreaService } from '../services/area.service';
import { CreateRestaurantAreaDto } from '../dto/create-area.dto';
import { Area } from '../entities/area.entity';

@ApiTags('Restaurant - Areas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/areas')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo khu vực mới' })
  create(@Body() createAreaDto: CreateRestaurantAreaDto): Promise<Area> {
    return this.areaService.create(createAreaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khu vực' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Bao gồm các khu vực không hoạt động',
  })
  findAll(
    @Query('branchId') branchId?: number,
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<Area[]> {
    return this.areaService.findAll(branchId, includeInactive === true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin khu vực theo ID' })
  findOne(@Param('id') id: string): Promise<Area> {
    return this.areaService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khu vực' })
  update(
    @Param('id') id: string,
    @Body() updateAreaDto: Partial<CreateRestaurantAreaDto>,
  ): Promise<Area> {
    return this.areaService.update(+id, updateAreaDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Kích hoạt khu vực' })
  @ApiParam({ name: 'id', description: 'ID của khu vực' })
  activate(@Param('id') id: string): Promise<Area> {
    return this.areaService.activate(+id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Vô hiệu hóa khu vực' })
  @ApiParam({ name: 'id', description: 'ID của khu vực' })
  deactivate(@Param('id') id: string): Promise<Area> {
    return this.areaService.deactivate(+id);
  }

  @Post('create-default')
  @ApiOperation({ summary: 'Tạo các khu vực mặc định cho chi nhánh' })
  @ApiQuery({
    name: 'branchId',
    required: true,
    type: Number,
    description: 'ID của chi nhánh',
  })
  createDefault(@Query('branchId') branchId: number): Promise<Area[]> {
    return this.areaService.createDefaultAreas(branchId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khu vực' })
  remove(@Param('id') id: string): Promise<void> {
    return this.areaService.remove(+id);
  }
}
