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
import { TableService } from '../services/table.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TableStatus, Table } from '../entities/table.entity';

interface TableQueryParams {
  page?: number;
  limit?: number;
  branchId?: number;
  status?: TableStatus;
  areaId?: number;
  isVIP?: boolean | string;
  isActive?: boolean | string;
}

@ApiTags('Restaurant Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/tables')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo bàn mới' })
  @ApiResponse({ status: 201, description: 'Table created successfully' })
  create(@Body() createTableDto: CreateTableDto): Promise<Table> {
    return this.tableService.create(createTableDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bàn' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TableStatus })
  @ApiQuery({ name: 'areaId', required: false, type: Number })
  @ApiQuery({ name: 'isVIP', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query() query: TableQueryParams,
  ): Promise<{ data: Table[]; total: number }> {
    return this.tableService.findAll(query);
  }

  @Get('by-area/:areaId')
  @ApiOperation({ summary: 'Lấy danh sách bàn theo khu vực' })
  findByArea(@Param('areaId') areaId: string): Promise<Table[]> {
    return this.tableService.findByArea(+areaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bàn theo ID' })
  findOne(@Param('id') id: string): Promise<Table> {
    return this.tableService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin bàn' })
  update(
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
  ): Promise<Table> {
    return this.tableService.update(+id, updateTableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bàn' })
  remove(@Param('id') id: string): Promise<void> {
    return this.tableService.remove(+id);
  }
}
