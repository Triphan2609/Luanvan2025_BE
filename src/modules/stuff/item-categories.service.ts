import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { ItemCategory } from './entities/item-category.entity';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';

@Injectable()
export class ItemCategoriesService {
  constructor(
    @InjectRepository(ItemCategory)
    private itemCategoriesRepository: Repository<ItemCategory>,
  ) {}

  async create(
    createItemCategoryDto: CreateItemCategoryDto,
  ): Promise<ItemCategory> {
    // Check for duplicate category name within the same branch
    const existingCategory = await this.itemCategoriesRepository.findOne({
      where: {
        name: createItemCategoryDto.name,
        branchId: createItemCategoryDto.branchId,
        isActive: true,
      },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Item category with name '${createItemCategoryDto.name}' already exists in this branch`,
      );
    }

    const newCategory = this.itemCategoriesRepository.create(
      createItemCategoryDto,
    );
    return await this.itemCategoriesRepository.save(newCategory);
  }

  async findAll(branchId?: number): Promise<ItemCategory[]> {
    const whereClause: Record<string, any> = { isActive: true };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    return await this.itemCategoriesRepository.find({
      where: whereClause,
      relations: ['branch', 'branch.branchType'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ItemCategory> {
    const category = await this.itemCategoriesRepository.findOne({
      where: { id, isActive: true },
      relations: ['items', 'branch', 'branch.branchType'],
    });

    if (!category) {
      throw new NotFoundException(`Item category with ID ${id} not found`);
    }

    return category;
  }

  async update(
    id: number,
    updateItemCategoryDto: UpdateItemCategoryDto,
  ): Promise<ItemCategory> {
    const category = await this.findOne(id);

    // Check for duplicate name if name is being updated
    if (
      updateItemCategoryDto.name &&
      updateItemCategoryDto.name !== category.name
    ) {
      const existingCategory = await this.itemCategoriesRepository.findOne({
        where: {
          name: updateItemCategoryDto.name,
          branchId: updateItemCategoryDto.branchId || category.branchId,
          isActive: true,
          id: Not(id),
        },
      });

      if (existingCategory) {
        throw new BadRequestException(
          `Item category with name '${updateItemCategoryDto.name}' already exists in this branch`,
        );
      }
    }

    Object.assign(category, updateItemCategoryDto);
    return await this.itemCategoriesRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    category.isActive = false;
    await this.itemCategoriesRepository.save(category);
  }

  /**
   * Cập nhật branchId cho tất cả các danh mục chưa có branch
   */
  async updateAllCategoriesBranch(
    branchId: number,
  ): Promise<{ updated: number }> {
    try {
      // Tìm tất cả danh mục không có branch
      const categoriesWithoutBranch = await this.itemCategoriesRepository.find({
        where: {
          branchId: IsNull(),
          isActive: true,
        },
      });

      // Nếu không có danh mục nào cần cập nhật
      if (categoriesWithoutBranch.length === 0) {
        return { updated: 0 };
      }

      // Cập nhật branchId cho tất cả các danh mục
      for (const category of categoriesWithoutBranch) {
        category.branchId = branchId;
      }

      // Lưu các thay đổi
      await this.itemCategoriesRepository.save(categoriesWithoutBranch);

      return { updated: categoriesWithoutBranch.length };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to update categories with branch: ${errorMessage}`,
      );
    }
  }
}
