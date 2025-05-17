import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';
import { FoodIngredient } from '../entities/food-ingredient.entity';

@Injectable()
export class IngredientService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(FoodIngredient)
    private readonly foodIngredientRepository: Repository<FoodIngredient>,
  ) {}

  findAll() {
    return this.ingredientRepository.find();
  }

  findOne(id: string) {
    return this.ingredientRepository.findOne({ where: { id } });
  }

  create(data: Partial<Ingredient>) {
    data.status =
      !data.quantity || data.quantity === 0
        ? 'out'
        : data.quantity < 10
          ? 'low'
          : 'available';
    const ingredient = this.ingredientRepository.create(data);
    return this.ingredientRepository.save(ingredient);
  }

  update(id: string, data: Partial<Ingredient>) {
    if (data.quantity !== undefined) {
      data.status =
        !data.quantity || data.quantity === 0
          ? 'out'
          : data.quantity < 10
            ? 'low'
            : 'available';
    }
    return this.ingredientRepository.update(id, data);
  }

  remove(id: string) {
    return this.ingredientRepository.delete(id);
  }

  async deductIngredientsForOrder(foodId: string, foodQuantity: number) {
    // Lấy danh sách nguyên liệu và số lượng cho món ăn
    const foodIngredients = await this.foodIngredientRepository.find({
      where: { foodId },
    });
    for (const fi of foodIngredients) {
      const ingredient = await this.ingredientRepository.findOne({
        where: { id: fi.ingredientId },
      });
      if (ingredient) {
        const deductAmount = fi.amount * foodQuantity;
        ingredient.quantity = Math.max(
          0,
          (ingredient.quantity || 0) - deductAmount,
        );
        ingredient.status =
          !ingredient.quantity || ingredient.quantity === 0
            ? 'out'
            : ingredient.quantity < 10
              ? 'low'
              : 'available';
        await this.ingredientRepository.save(ingredient);
      }
    }
  }
}
