import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftType } from './entities/shift.entity';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  findAll(
    @Query('type') type?: ShiftType,
    @Query('isActive') isActive?: string | boolean,
  ) {
    return this.shiftsService.findAll({
      type,
      isActive:
        isActive === undefined
          ? undefined
          : isActive === true || isActive === 'true',
    });
  }

  @Get('active')
  findActive() {
    return this.shiftsService.findAll({ isActive: true });
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.shiftsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftsService.update(+id, updateShiftDto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.shiftsService.activate(+id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.shiftsService.deactivate(+id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(+id);
  }
}
