import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull, In } from 'typeorm';
import { Room, RoomStatus } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomTypesService } from '../room-types/room-types.service';
import { RoomStatsDto } from './dto/room-stats.dto';
import { Item } from '../stuff/entities/item.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    private roomTypesService: RoomTypesService,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    // Check if room type exists
    await this.roomTypesService.findOne(createRoomDto.roomTypeId);

    // Check if roomCode is already used
    const existingRoom = await this.roomsRepository.findOne({
      where: { roomCode: createRoomDto.roomCode, isActive: true },
    });

    if (existingRoom) {
      throw new BadRequestException(
        `Room with code ${createRoomDto.roomCode} already exists`,
      );
    }

    const room = this.roomsRepository.create(createRoomDto);
    const savedRoom = await this.roomsRepository.save(room);

    // Nếu có danh sách vật dụng được chọn khi tạo phòng
    if (createRoomDto.itemIds && createRoomDto.itemIds.length > 0) {
      await this.updateRoomItems(savedRoom.id, createRoomDto.itemIds);
    }

    return await this.findOne(savedRoom.id);
  }

  async findAll(
    floor?: any,
    roomTypeId?: number,
    status?: string,
    branchId?: number,
  ): Promise<Room[]> {
    // Create a clean where object
    const where: FindOptionsWhere<Room> = { isActive: true };

    // Handle the floor parameter - detailed validation and warnings
    if (floor !== undefined && floor !== null) {
      // If it's a string that can be converted to a number
      if (typeof floor === 'string' && !isNaN(Number(floor))) {
        where.floor = Number(floor);
      }
      // If it's a number, use directly
      else if (typeof floor === 'number') {
        where.floor = floor;
      }
      // If it's an object with floorId property (from frontend)
      else if (
        typeof floor === 'object' &&
        floor !== null &&
        'floorId' in floor
      ) {
        const floorObj = floor as { floorId: any };
        if (!isNaN(Number(floorObj.floorId))) {
          where.floorId = Number(floorObj.floorId);
        }
      }
      // If it's something else, ignore and warn
      else {
        console.warn(`Invalid floor parameter ignored:`, floor);
      }
    }

    if (roomTypeId) {
      where.roomTypeId = roomTypeId;
    }

    if (status && Object.values(RoomStatus).includes(status as RoomStatus)) {
      where.status = status as RoomStatus;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    try {
      const rooms = await this.roomsRepository.find({
        where,
        order: { floor: 'ASC', roomCode: 'ASC' },
        relations: ['roomType'],
      });

      return rooms;
    } catch (error) {
      console.error('Error in findAll method:', error);
      console.error('SQL query parameters:', where);
      throw error;
    }
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id, isActive: true },
      relations: ['roomType', 'items', 'items.category', 'items.branch'],
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);

    // If changing roomTypeId, check if it exists
    if (updateRoomDto.roomTypeId) {
      await this.roomTypesService.findOne(updateRoomDto.roomTypeId);
    }

    // If changing roomCode, check if it's unique
    if (updateRoomDto.roomCode && updateRoomDto.roomCode !== room.roomCode) {
      const existingRoom = await this.roomsRepository.findOne({
        where: { roomCode: updateRoomDto.roomCode, isActive: true },
      });

      if (existingRoom) {
        throw new BadRequestException(
          `Room with code ${updateRoomDto.roomCode} already exists`,
        );
      }
    }

    Object.assign(room, updateRoomDto);
    const updatedRoom = await this.roomsRepository.save(room);

    // Cập nhật danh sách vật dụng nếu có itemIds được cung cấp trong request
    if (updateRoomDto.itemIds !== undefined) {
      await this.updateRoomItems(updatedRoom.id, updateRoomDto.itemIds || []);
    }

    return await this.findOne(updatedRoom.id);
  }

  async remove(id: number): Promise<void> {
    const room = await this.findOne(id);
    room.isActive = false;
    await this.roomsRepository.save(room);
  }

  async updateStatus(
    id: number,
    status: string,
    maintenanceEndDate?: string,
    cleaningEndDate?: string,
  ): Promise<Room> {
    const room = await this.findOne(id);

    if (!Object.values(RoomStatus).includes(status as RoomStatus)) {
      throw new BadRequestException(`Invalid room status: ${status}`);
    }

    room.status = status as RoomStatus;

    // If status is Maintenance and maintenanceEndDate is provided, save it
    if (room.status === RoomStatus.MAINTENANCE && maintenanceEndDate) {
      room.maintenanceEndDate = new Date(maintenanceEndDate);
    } else if (room.status !== RoomStatus.MAINTENANCE) {
      // If status is not Maintenance, clear the maintenanceEndDate
      room.maintenanceEndDate = null;
    }

    // If status is Cleaning and cleaningEndDate is provided, save it
    if (room.status === RoomStatus.CLEANING && cleaningEndDate) {
      room.cleaningEndDate = new Date(cleaningEndDate);
    } else if (room.status !== RoomStatus.CLEANING) {
      // If status is not Cleaning, clear the cleaningEndDate
      room.cleaningEndDate = null;
    }

    return await this.roomsRepository.save(room);
  }

  async getRoomStats(
    floor?: number,
    roomTypeId?: number,
    status?: string,
    branchId?: number,
  ): Promise<RoomStatsDto> {
    const rooms = await this.findAll(floor, roomTypeId, status, branchId);

    const stats = new RoomStatsDto();
    stats.total = rooms.length;
    stats.available = rooms.filter(
      (room) => room.status === RoomStatus.AVAILABLE,
    ).length;
    stats.booked = rooms.filter(
      (room) => room.status === RoomStatus.BOOKED,
    ).length;
    stats.cleaning = rooms.filter(
      (room) => room.status === RoomStatus.CLEANING,
    ).length;
    stats.maintenance = rooms.filter(
      (room) => room.status === RoomStatus.MAINTENANCE,
    ).length;

    return stats;
  }

  async getFloors(): Promise<number[]> {
    const rooms = await this.roomsRepository.find({
      where: { isActive: true },
      select: ['floor'],
    });

    // Extract unique floor numbers
    const floors = [...new Set(rooms.map((room) => room.floor))];
    return floors.sort((a, b) => a - b);
  }

  /**
   * Cập nhật branchId cho tất cả các phòng chưa có branch
   */
  async updateAllRoomsBranch(branchId: number): Promise<{ updated: number }> {
    try {
      // Tìm tất cả phòng không có branch
      const roomsWithoutBranch = await this.roomsRepository.find({
        where: {
          branchId: IsNull(),
        },
      });

      // Nếu không có phòng nào cần cập nhật
      if (roomsWithoutBranch.length === 0) {
        return { updated: 0 };
      }

      // Cập nhật branchId cho tất cả các phòng
      for (const room of roomsWithoutBranch) {
        room.branchId = branchId;
      }

      // Lưu các thay đổi
      await this.roomsRepository.save(roomsWithoutBranch);

      return { updated: roomsWithoutBranch.length };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to update rooms with branch: ${errorMessage}`,
      );
    }
  }

  /**
   * Lấy danh sách vật dụng của phòng
   */
  async getRoomItems(roomId: number) {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId, isActive: true },
      relations: ['items', 'items.category', 'items.branch'],
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return room.items || [];
  }

  /**
   * Cập nhật danh sách vật dụng của phòng
   */
  async updateRoomItems(roomId: number, itemIds: number[]) {
    try {
      // Tìm phòng
      const room = await this.roomsRepository.findOne({
        where: { id: roomId, isActive: true },
        relations: ['items', 'items.category', 'items.branch'],
      });

      if (!room) {
        throw new NotFoundException(`Room with ID ${roomId} not found`);
      }

      // Lưu lại danh sách vật dụng hiện tại để xử lý trạng thái đang sử dụng
      const currentItems = [...(room.items || [])];
      const currentItemIds = currentItems.map((item) => item.id);

      if (!itemIds || itemIds.length === 0) {
        // Xóa tất cả các vật dụng
        room.items = [];

        // Cập nhật trạng thái của các vật dụng bị xóa khỏi phòng (giảm inUseQuantity)
        for (const itemId of currentItemIds) {
          const item = await this.itemRepository.findOne({
            where: { id: itemId },
          });
          if (item && item.inUseQuantity > 0) {
            item.inUseQuantity -= 1;
            await this.itemRepository.save(item);
          }
        }
      } else {
        // Tìm các vật dụng từ database
        const items = await this.itemRepository.find({
          where: { id: In(itemIds) },
          relations: ['category', 'branch'],
        });

        if (items.length !== itemIds.length) {
          // Một số vật dụng không tồn tại
          const foundIds = items.map((item) => item.id);
          const missingIds = itemIds.filter((id) => !foundIds.includes(id));
          console.warn(`Some items not found: ${missingIds.join(', ')}`);
        }

        // Gán trực tiếp các đối tượng Item tìm được
        room.items = items;

        // Tính toán vật dụng mới thêm vào và vật dụng bị xóa
        const newItemIds = itemIds.filter((id) => !currentItemIds.includes(id));
        const removedItemIds = currentItemIds.filter(
          (id) => !itemIds.includes(id),
        );

        // Cập nhật inUseQuantity cho các vật dụng mới thêm vào (tăng inUseQuantity)
        for (const itemId of newItemIds) {
          const item = await this.itemRepository.findOne({
            where: { id: itemId },
          });
          if (item) {
            // Chỉ tăng nếu còn đủ số lượng trong kho
            if (item.stockQuantity > 0) {
              item.stockQuantity -= 1;
              item.inUseQuantity += 1;
              await this.itemRepository.save(item);
            } else {
              console.warn(
                `Not enough stock for item ${item.name} (ID: ${item.id})`,
              );
            }
          }
        }

        // Cập nhật inUseQuantity cho các vật dụng bị xóa khỏi phòng (giảm inUseQuantity)
        for (const itemId of removedItemIds) {
          const item = await this.itemRepository.findOne({
            where: { id: itemId },
          });
          if (item && item.inUseQuantity > 0) {
            item.inUseQuantity -= 1;
            item.stockQuantity += 1;
            await this.itemRepository.save(item);
          }
        }
      }

      // Lưu phòng với mối quan hệ mới
      await this.roomsRepository.save(room);

      return {
        updated: true,
        itemCount: room.items.length,
        message: 'Room items updated successfully',
      };
    } catch (error) {
      console.error('Error updating room items:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update room items: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
