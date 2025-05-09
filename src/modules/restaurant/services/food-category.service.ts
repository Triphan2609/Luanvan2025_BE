import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodCategory } from '../entities/food-category.entity';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FoodCategoryService {
  constructor(
    @InjectRepository(FoodCategory)
    private readonly foodCategoryRepository: Repository<FoodCategory>,
  ) {}

  async create(
    createFoodCategoryDto: CreateFoodCategoryDto,
  ): Promise<FoodCategory> {
    try {
      // Create a new food category entity
      const foodCategory = new FoodCategory();
      // Copy properties from DTO to entity
      Object.assign(foodCategory, createFoodCategoryDto);

      // Save the entity
      return this.foodCategoryRepository.save(foodCategory);
    } catch (error: unknown) {
      console.error('Error creating food category:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Error creating food category: ${errorMessage}`,
      );
    }
  }

  async findAll(
    query: Record<string, any>,
  ): Promise<{ data: FoodCategory[]; total: number }> {
    const { page = 1, limit = 10, branchId, isActive, name } = query;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.foodCategoryRepository.createQueryBuilder('category');

    // Apply filters
    if (branchId) {
      queryBuilder.andWhere('category.branchId = :branchId', { branchId });
    }

    if (isActive !== undefined) {
      const isActiveBool = isActive === 'true' || isActive === true;
      queryBuilder.andWhere('category.isActive = :isActive', {
        isActive: isActiveBool,
      });
    }

    if (name) {
      queryBuilder.andWhere('category.name LIKE :name', { name: `%${name}%` });
    }

    // Count total items for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Order by name ascending
    queryBuilder.orderBy('category.name', 'ASC');

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findOne(id: string): Promise<FoodCategory> {
    const foodCategory = await this.foodCategoryRepository.findOne({
      where: { id },
    });

    if (!foodCategory) {
      throw new NotFoundException(`Food category with ID ${id} not found`);
    }

    return foodCategory;
  }

  async update(
    id: string,
    updateFoodCategoryDto: UpdateFoodCategoryDto,
  ): Promise<FoodCategory> {
    const foodCategory = await this.findOne(id);

    // Update the category properties
    Object.assign(foodCategory, updateFoodCategoryDto);

    return this.foodCategoryRepository.save(foodCategory);
  }

  async remove(id: string): Promise<void> {
    // Tìm danh mục trước khi xóa để lấy đường dẫn ảnh
    const foodCategory = await this.findOne(id);

    // Xóa danh mục từ database
    const result = await this.foodCategoryRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Food category with ID ${id} not found`);
    }

    // Nếu có đường dẫn ảnh, tiến hành xóa file ảnh
    if (foodCategory.imageUrl) {
      try {
        // Lấy tên file từ đường dẫn (xóa phần /uploads/)
        const imagePath = foodCategory.imageUrl.replace(/^\/uploads\//, '');
        const fullPath = path.join(process.cwd(), 'uploads', imagePath);

        // Kiểm tra file tồn tại trước khi xóa
        if (fs.existsSync(fullPath)) {
          console.log(`Deleting image file: ${fullPath}`);
          fs.unlinkSync(fullPath);
          console.log(`Image file deleted successfully`);
        } else {
          console.log(`Image file not found: ${fullPath}`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error deleting image file: ${errorMessage}`);
        // Không throw lỗi tại đây để đảm bảo danh mục vẫn bị xóa ngay cả khi không xóa được file
      }
    }
  }

  async updateImage(id: string, imageUrl: string): Promise<FoodCategory> {
    console.log(`Updating image for category ID: ${id} with URL: ${imageUrl}`);

    const foodCategory = await this.findOne(id);
    console.log('Found category before update:', JSON.stringify(foodCategory));

    // Cập nhật đường dẫn hình ảnh
    foodCategory.imageUrl = imageUrl;

    const updatedCategory =
      await this.foodCategoryRepository.save(foodCategory);
    console.log('Category after update:', JSON.stringify(updatedCategory));

    return updatedCategory;
  }
}
