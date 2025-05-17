import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { Promotion } from './entities/promotion.entity';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  create(@Body() data: Partial<Promotion>) {
    return this.promotionsService.create(data);
  }

  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.promotionsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() data: Partial<Promotion>) {
    return this.promotionsService.update(Number(id), data);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.promotionsService.remove(Number(id));
  }
}
