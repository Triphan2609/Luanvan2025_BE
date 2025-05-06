import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Item, ItemType } from './entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemCategoriesService } from './item-categories.service';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    private itemCategoriesService: ItemCategoriesService,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<Item> {
    // Check if category exists
    await this.itemCategoriesService.findOne(createItemDto.categoryId);

    // Check for duplicate item name within the same branch
    const existingItem = await this.itemsRepository.findOne({
      where: {
        name: createItemDto.name,
        branchId: createItemDto.branchId,
        isActive: true,
      },
    });

    if (existingItem) {
      throw new BadRequestException(
        `Item with name '${createItemDto.name}' already exists in this branch`,
      );
    }

    // Validate fields based on item type
    this.validateItemTypeFields(createItemDto);

    const newItem = this.itemsRepository.create(createItemDto);
    return await this.itemsRepository.save(newItem);
  }

  async findAll(
    categoryId?: number,
    branchId?: number,
    itemType?: string,
  ): Promise<Item[]> {
    const whereClause: Record<string, any> = { isActive: true };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (itemType) {
      whereClause.itemType = itemType;
    }

    return await this.itemsRepository.find({
      where: whereClause,
      relations: ['category', 'branch', 'branch.branchType'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Item> {
    const item = await this.itemsRepository.findOne({
      where: { id, isActive: true },
      relations: ['category', 'branch', 'branch.branchType', 'rooms'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);

    // Check if category exists when changing category
    if (updateItemDto.categoryId) {
      await this.itemCategoriesService.findOne(updateItemDto.categoryId);
    }

    // Check for duplicate name if name is being updated
    if (updateItemDto.name && updateItemDto.name !== item.name) {
      const existingItem = await this.itemsRepository.findOne({
        where: {
          name: updateItemDto.name,
          branchId: updateItemDto.branchId || item.branchId,
          isActive: true,
          id: Not(id),
        },
      });

      if (existingItem) {
        throw new BadRequestException(
          `Item with name '${updateItemDto.name}' already exists in this branch`,
        );
      }
    }

    // If itemType is changing, validate the new type's required fields
    if (updateItemDto.itemType && updateItemDto.itemType !== item.itemType) {
      this.validateItemTypeFields({
        ...item,
        ...updateItemDto,
      });
    }

    Object.assign(item, updateItemDto);
    return await this.itemsRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.itemsRepository.save(item);
  }

  async getItemsByCategoryType(
    categoryType: string,
    branchId?: number,
  ): Promise<Item[]> {
    try {
      // Find the category by name
      const categories = await this.itemCategoriesService.findAll();
      // Filter categories by branch if branchId is provided
      const filteredCategories = branchId
        ? categories.filter((cat) => cat.branchId === branchId)
        : categories;

      const category = filteredCategories.find(
        (cat) => cat.name === categoryType,
      );

      if (!category) {
        return [];
      }

      return this.findAll(category.id, branchId);
    } catch {
      return [];
    }
  }

  /**
   * Cập nhật branchId cho tất cả các items chưa có branch
   */
  async updateAllItemsBranch(branchId: number): Promise<{ updated: number }> {
    try {
      // Tìm tất cả items không có branch
      const itemsWithoutBranch = await this.itemsRepository.find({
        where: {
          branchId: IsNull(),
          isActive: true,
        },
      });

      // Nếu không có items nào cần cập nhật
      if (itemsWithoutBranch.length === 0) {
        return { updated: 0 };
      }

      // Cập nhật branchId cho tất cả các items
      for (const item of itemsWithoutBranch) {
        item.branchId = branchId;
      }

      // Lưu các thay đổi
      await this.itemsRepository.save(itemsWithoutBranch);

      return { updated: itemsWithoutBranch.length };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to update items with branch: ${errorMessage}`,
      );
    }
  }

  /**
   * Process item usage when a room is booked
   * This will update the item's inventory based on its type
   */
  async processItemUsage(itemId: number, quantity: number = 1): Promise<Item> {
    const item = await this.findOne(itemId);

    switch (item.itemType) {
      case ItemType.SINGLE_USE:
        // For single-use items, reduce stock and increase in-use count
        if (item.stockQuantity < quantity) {
          throw new BadRequestException(
            `Not enough ${item.name} in stock. Available: ${item.stockQuantity}`,
          );
        }
        item.stockQuantity -= quantity;
        item.inUseQuantity += quantity;
        break;

      case ItemType.MULTIPLE_USE:
        // For multiple-use items, check if we have remaining uses
        // If no more uses, decrement stock and reset uses
        if (item.currentUses >= item.maxUses) {
          if (item.stockQuantity < quantity) {
            throw new BadRequestException(
              `Not enough ${item.name} in stock. Available: ${item.stockQuantity}`,
            );
          }
          item.stockQuantity -= quantity;
          item.inUseQuantity += quantity;
          item.currentUses = 0; // Reset current uses
        } else {
          // Increment current uses if we still have uses left
          item.currentUses += 1;
        }
        break;

      case ItemType.LONG_TERM:
        // For long-term items, just track in-use count
        if (item.stockQuantity < quantity) {
          throw new BadRequestException(
            `Not enough ${item.name} in stock. Available: ${item.stockQuantity}`,
          );
        }
        item.inUseQuantity += quantity;
        break;
    }

    return await this.itemsRepository.save(item);
  }

  /**
   * Process item return when a room is checked out
   * This will update the item's inventory based on its type
   */
  async processItemReturn(itemId: number, quantity: number = 1): Promise<Item> {
    const item = await this.findOne(itemId);

    switch (item.itemType) {
      case ItemType.SINGLE_USE:
        // Single-use items are consumed and not returned to stock
        // Just reduce the in-use count
        if (item.inUseQuantity < quantity) {
          throw new BadRequestException(
            `Cannot return more items than are in use. In use: ${item.inUseQuantity}`,
          );
        }
        item.inUseQuantity -= quantity;
        break;

      case ItemType.MULTIPLE_USE:
        // For multiple-use items, check if we've reached max uses
        // If reached max uses, the item was already removed from stock
        if (item.inUseQuantity < quantity) {
          throw new BadRequestException(
            `Cannot return more items than are in use. In use: ${item.inUseQuantity}`,
          );
        }
        item.inUseQuantity -= quantity;
        break;

      case ItemType.LONG_TERM:
        // Long-term items are returned to available stock
        if (item.inUseQuantity < quantity) {
          throw new BadRequestException(
            `Cannot return more items than are in use. In use: ${item.inUseQuantity}`,
          );
        }
        item.inUseQuantity -= quantity;
        break;
    }

    return await this.itemsRepository.save(item);
  }

  /**
   * Validate fields based on item type
   */
  private validateItemTypeFields(
    item: CreateItemDto | UpdateItemDto | Item,
  ): void {
    if (
      item.itemType === ItemType.MULTIPLE_USE &&
      (item.maxUses === undefined || item.maxUses <= 0)
    ) {
      throw new BadRequestException(
        'Multiple-use items must have maxUses greater than 0',
      );
    }
  }
}
