import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Floor } from './entities/floor.entity';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { Room } from '../rooms/entities/room.entity';

@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private floorsRepository: Repository<Floor>,
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async create(createFloorDto: CreateFloorDto): Promise<Floor> {
    // Check if floor number already exists for the branch
    const existingFloor = await this.floorsRepository.findOne({
      where: {
        floorNumber: createFloorDto.floorNumber,
        branchId: createFloorDto.branchId,
        isActive: true,
      },
    });

    if (existingFloor) {
      throw new ConflictException(
        `Floor number ${createFloorDto.floorNumber} already exists for this branch`,
      );
    }

    const floor = this.floorsRepository.create(createFloorDto);
    return await this.floorsRepository.save(floor);
  }

  async findAll(branchId?: number): Promise<Floor[]> {
    const where = { isActive: true };

    if (branchId) {
      where['branchId'] = branchId;
    }

    return await this.floorsRepository.find({
      where,
      order: { floorNumber: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Floor> {
    const floor = await this.floorsRepository.findOne({
      where: { id, isActive: true },
    });

    if (!floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }

    return floor;
  }

  async update(id: number, updateFloorDto: UpdateFloorDto): Promise<Floor> {
    const floor = await this.findOne(id);

    // If changing floorNumber, check for duplicates
    if (
      updateFloorDto.floorNumber &&
      updateFloorDto.floorNumber !== floor.floorNumber
    ) {
      const existingFloor = await this.floorsRepository.findOne({
        where: {
          floorNumber: updateFloorDto.floorNumber,
          branchId: updateFloorDto.branchId || floor.branchId,
          isActive: true,
        },
      });

      if (existingFloor) {
        throw new ConflictException(
          `Floor number ${updateFloorDto.floorNumber} already exists for this branch`,
        );
      }
    }

    Object.assign(floor, updateFloorDto);
    return await this.floorsRepository.save(floor);
  }

  async remove(id: number): Promise<void> {
    const floor = await this.findOne(id);

    // Check if there are any rooms associated with this floor
    const roomsCount = await this.roomsRepository.count({
      where: { floorId: id, isActive: true },
    });

    if (roomsCount > 0) {
      throw new BadRequestException(
        `Cannot delete floor as it has ${roomsCount} active rooms associated with it`,
      );
    }

    floor.isActive = false;
    await this.floorsRepository.save(floor);
  }

  async getFloorsByBranch(branchId: number): Promise<Floor[]> {
    return await this.floorsRepository.find({
      where: { branchId, isActive: true },
      order: { floorNumber: 'ASC' },
    });
  }

  async getFloorDetails(id: number): Promise<any> {
    const floor = await this.findOne(id);

    const roomsCount = await this.roomsRepository.count({
      where: { floorId: id, isActive: true },
    });

    return {
      ...floor,
      roomsCount,
    };
  }
}
