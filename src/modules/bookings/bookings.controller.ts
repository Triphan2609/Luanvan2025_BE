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
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Booking } from './entities/booking.entity';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The booking has been successfully created.',
    type: Booking,
  })
  create(@Body() createBookingDto: CreateBookingDto): Promise<Booking> {
    return this.bookingsService.create(createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of bookings',
    type: [Booking],
  })
  async findAll(@Query() query: QueryBookingDto): Promise<{
    data: Booking[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.bookingsService.findAll(query);
    return {
      data,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get room availability calendar' })
  @ApiQuery({ name: 'branchId', required: true, type: Number })
  @ApiQuery({ name: 'startDate', required: true, type: Date })
  @ApiQuery({ name: 'endDate', required: true, type: Date })
  @ApiQuery({ name: 'floorId', required: false, type: Number })
  @ApiQuery({ name: 'roomTypeId', required: false, type: Number })
  @ApiQuery({
    name: 'forceRefresh',
    required: false,
    type: Boolean,
    description: 'Force refresh data from database',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Room availability calendar',
  })
  async getRoomAvailabilityCalendar(
    @Query('branchId') branchId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('floorId') floorId?: number,
    @Query('roomTypeId') roomTypeId?: number,
    @Query('forceRefresh') forceRefresh?: string | boolean,
  ): Promise<any[]> {
    if (!branchId || !startDate || !endDate) {
      throw new BadRequestException(
        'branchId, startDate, and endDate are required',
      );
    }

    const shouldForceRefresh =
      forceRefresh === 'true' || forceRefresh === true || forceRefresh === '1';

    return this.bookingsService.getRoomAvailabilityCalendar(
      +branchId,
      new Date(startDate),
      new Date(endDate),
      floorId ? +floorId : undefined,
      roomTypeId ? +roomTypeId : undefined,
      shouldForceRefresh,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully retrieved.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  findOne(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.findOne(id);
  }

  @Get('code/:bookingCode')
  @ApiOperation({ summary: 'Get a booking by booking code' })
  @ApiParam({ name: 'bookingCode', description: 'Booking Code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully retrieved.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  findByCode(@Param('bookingCode') bookingCode: string): Promise<Booking> {
    return this.bookingsService.findByCode(bookingCode);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully updated.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.bookingsService.remove(id);
  }

  @Patch(':id/check-in')
  @ApiOperation({ summary: 'Check-in a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully checked in.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  checkIn(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.checkIn(id);
  }

  @Patch(':id/check-out')
  @ApiOperation({ summary: 'Check-out a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully checked out.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  checkOut(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.checkOut(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully confirmed.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  confirm(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.confirm(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'Customer cancelled due to schedule change',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully cancelled.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Booking> {
    return this.bookingsService.cancel(id, reason);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          example: 'No rooms available for the requested dates',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The booking has been successfully rejected.',
    type: Booking,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Booking> {
    return this.bookingsService.reject(id, reason);
  }
}
