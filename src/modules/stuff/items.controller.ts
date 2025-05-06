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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(createItemDto);
  }

  @Get()
  findAll(
    @Query('categoryId') categoryId?: number,
    @Query('branchId') branchId?: number,
    @Query('itemType') itemType?: string,
  ) {
    return this.itemsService.findAll(categoryId, branchId, itemType);
  }

  @Get('by-category/:type')
  getItemsByCategoryType(
    @Param('type') type: string,
    @Query('branchId') branchId?: number,
  ) {
    return this.itemsService.getItemsByCategoryType(type, branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return this.itemsService.update(+id, updateItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(+id);
  }

  @Post('update-all-branch')
  updateAllBranch(@Body() data: { branchId: number }) {
    return this.itemsService.updateAllItemsBranch(data.branchId);
  }

  @Post(':id/usage')
  processItemUsage(
    @Param('id') id: string,
    @Body() data: { quantity?: number },
  ) {
    return this.itemsService.processItemUsage(
      +id,
      data.quantity ? data.quantity : 1,
    );
  }

  @Post(':id/return')
  processItemReturn(
    @Param('id') id: string,
    @Body() data: { quantity?: number },
  ) {
    return this.itemsService.processItemReturn(
      +id,
      data.quantity ? data.quantity : 1,
    );
  }
}
