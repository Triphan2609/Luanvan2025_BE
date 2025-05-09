import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Food } from '../entities/food.entity';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FoodService {
  constructor(
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
  ) {}

  async create(createFoodDto: CreateFoodDto): Promise<Food> {
    try {
      // Create a new food entity
      const food = new Food();

      // Copy all properties directly - TypeORM will handle the conversions
      Object.assign(food, createFoodDto);

      // Save the entity
      console.log('Creating food with data:', JSON.stringify(food));
      return this.foodRepository.save(food);
    } catch (error: unknown) {
      console.error('Error creating food:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Error creating food: ${errorMessage}`);
    }
  }

  async findAll(
    query: Record<string, any>,
  ): Promise<{ data: Food[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      branchId,
      status,
      categoryId,
      name,
      isVegetarian,
      isVegan,
      isGlutenFree,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.foodRepository.createQueryBuilder('food');

    // Apply filters with proper typing
    if (branchId) {
      queryBuilder.andWhere('food.branchId = :branchId', {
        branchId: Number(branchId),
      });
    }

    if (status) {
      queryBuilder.andWhere('food.status = :status', {
        status: String(status),
      });
    }

    if (categoryId) {
      queryBuilder.andWhere('food.categoryId = :categoryId', {
        categoryId: String(categoryId),
      });
    }

    if (name) {
      queryBuilder.andWhere('food.name LIKE :name', {
        name: `%${String(name)}%`,
      });
    }

    if (isVegetarian !== undefined) {
      queryBuilder.andWhere('food.isVegetarian = :isVegetarian', {
        isVegetarian: Boolean(isVegetarian),
      });
    }

    if (isVegan !== undefined) {
      queryBuilder.andWhere('food.isVegan = :isVegan', {
        isVegan: Boolean(isVegan),
      });
    }

    if (isGlutenFree !== undefined) {
      queryBuilder.andWhere('food.isGlutenFree = :isGlutenFree', {
        isGlutenFree: Boolean(isGlutenFree),
      });
    }

    // Count total items for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Order by name ascending
    queryBuilder.orderBy('food.name', 'ASC');

    // Add relationships
    queryBuilder.leftJoinAndSelect('food.category', 'category');

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findOne(id: string): Promise<Food> {
    const food = await this.foodRepository.findOne({
      where: { id },
      relations: ['category', 'menus'],
    });

    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }

    return food;
  }

  async update(id: string, updateFoodDto: UpdateFoodDto): Promise<Food> {
    const food = await this.findOne(id);

    // Update the food properties
    Object.assign(food, updateFoodDto);

    return this.foodRepository.save(food);
  }

  async remove(id: string): Promise<void> {
    // Tìm món ăn trước khi xóa để lấy đường dẫn ảnh
    const food = await this.findOne(id);

    // Xóa món ăn từ database
    const result = await this.foodRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }

    // Nếu có đường dẫn ảnh, tiến hành xóa file ảnh
    if (food.imageUrl) {
      try {
        // Lấy tên file từ đường dẫn (xóa phần /uploads/)
        const imagePath = food.imageUrl.replace(/^\/uploads\//, '');
        const fullPath = path.join(process.cwd(), 'uploads', imagePath);

        // Kiểm tra file tồn tại trước khi xóa
        if (fs.existsSync(fullPath)) {
          console.log(`Deleting food image file: ${fullPath}`);
          fs.unlinkSync(fullPath);
          console.log(`Food image file deleted successfully`);
        } else {
          console.log(`Food image file not found: ${fullPath}`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error deleting food image file: ${errorMessage}`);
        // Không throw lỗi tại đây để đảm bảo món ăn vẫn bị xóa ngay cả khi không xóa được file
      }
    }
  }

  async updateImage(id: string, imageUrl: string): Promise<Food> {
    const food = await this.findOne(id);

    // Cập nhật đường dẫn hình ảnh
    food.imageUrl = imageUrl;

    return this.foodRepository.save(food);
  }
}
