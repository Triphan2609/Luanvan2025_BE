import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from './entities/room-type.entity';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,
  ) {}

  async create(createRoomTypeDto: CreateRoomTypeDto): Promise<RoomType> {
    const roomType = this.roomTypesRepository.create(createRoomTypeDto);
    return await this.roomTypesRepository.save(roomType);
  }

  async findAll(): Promise<RoomType[]> {
    return await this.roomTypesRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<RoomType> {
    const roomType = await this.roomTypesRepository.findOne({
      where: { id, isActive: true },
    });
    if (!roomType) {
      throw new NotFoundException(`Room type with ID ${id} not found`);
    }
    return roomType;
  }

  async update(
    id: number,
    updateRoomTypeDto: UpdateRoomTypeDto,
  ): Promise<RoomType> {
    const roomType = await this.findOne(id);
    Object.assign(roomType, updateRoomTypeDto);
    return await this.roomTypesRepository.save(roomType);
  }

  async remove(id: number): Promise<void> {
    const roomType = await this.findOne(id);
    roomType.isActive = false;
    await this.roomTypesRepository.save(roomType);
  }
}
