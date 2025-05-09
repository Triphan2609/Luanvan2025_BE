import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MenuService } from '../services/menu.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Restaurant Menus')
@Controller('restaurant/menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new menu' })
  @ApiResponse({ status: 201, description: 'Menu created successfully' })
  create(@Body() createMenuDto: any) {
    return this.menuService.create(createMenuDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all menus' })
  findAll(@Query() query: any) {
    return this.menuService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a menu by id' })
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a menu' })
  update(@Param('id') id: string, @Body() updateMenuDto: any) {
    return this.menuService.update(id, updateMenuDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a menu' })
  remove(@Param('id') id: string) {
    return this.menuService.remove(id);
  }
}
