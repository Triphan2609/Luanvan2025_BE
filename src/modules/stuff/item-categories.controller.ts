import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ItemCategoriesService } from './item-categories.service';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';

@Controller('item-categories')
export class ItemCategoriesController {
  constructor(private readonly itemCategoriesService: ItemCategoriesService) {}

  @Post()
  create(@Body() createItemCategoryDto: CreateItemCategoryDto) {
    return this.itemCategoriesService.create(createItemCategoryDto);
  }

  @Get()
  findAll(@Query('branchId') branchId?: number) {
    return this.itemCategoriesService.findAll(branchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemCategoryDto: UpdateItemCategoryDto,
  ) {
    return this.itemCategoriesService.update(id, updateItemCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemCategoriesService.remove(id);
  }

  @Post('update-all-branch')
  updateAllBranch(@Body() data: { branchId: number }) {
    return this.itemCategoriesService.updateAllCategoriesBranch(data.branchId);
  }
}
