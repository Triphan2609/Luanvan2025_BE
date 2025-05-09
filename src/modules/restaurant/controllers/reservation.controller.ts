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
import { ReservationService } from '../services/reservation.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

@ApiTags('Restaurant Reservations')
@Controller('restaurant/reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationService.create(createReservationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  findAll(@Query() query: any) {
    return this.reservationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by id' })
  findOne(@Param('id') id: string) {
    return this.reservationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reservation' })
  remove(@Param('id') id: string) {
    return this.reservationService.remove(id);
  }
}
