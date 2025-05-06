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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room, RoomStatus } from './entities/room.entity';
import { RoomStatsDto } from './dto/room-stats.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto): Promise<Room> {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  findAll(
    @Query('floor') floor?: number,
    @Query('roomTypeId') roomTypeId?: number,
    @Query('status') status?: string,
    @Query('branchId') branchId?: number,
  ): Promise<Room[]> {
    return this.roomsService.findAll(floor, roomTypeId, status, branchId);
  }

  @Get('stats')
  getRoomStats(
    @Query('floor') floor?: number,
    @Query('roomTypeId') roomTypeId?: number,
    @Query('status') status?: string,
    @Query('branchId') branchId?: number,
  ): Promise<RoomStatsDto> {
    return this.roomsService.getRoomStats(floor, roomTypeId, status, branchId);
  }

  @Get('floors')
  getFloors(): Promise<number[]> {
    return this.roomsService.getFloors();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Room> {
    return this.roomsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ): Promise<Room> {
    return this.roomsService.update(+id, updateRoomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.roomsService.remove(+id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      maintenanceEndDate?: string;
      cleaningEndDate?: string;
    },
  ): Promise<Room> {
    return this.roomsService.updateStatus(
      +id,
      body.status,
      body.maintenanceEndDate,
      body.cleaningEndDate,
    );
  }

  @Post('update-all-branch')
  updateAllBranch(@Body() data: { branchId: number }) {
    return this.roomsService.updateAllRoomsBranch(data.branchId);
  }

  @Get(':id/items')
  getRoomItems(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.getRoomItems(id);
  }

  @Post(':id/items')
  updateRoomItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { itemIds: number[] },
  ) {
    return this.roomsService.updateRoomItems(id, data.itemIds);
  }
}
