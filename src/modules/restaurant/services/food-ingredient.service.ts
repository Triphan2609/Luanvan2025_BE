import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodIngredient } from '../entities/food-ingredient.entity';

@Injectable()
export class FoodIngredientService {
  constructor(
    @InjectRepository(FoodIngredient)
    private readonly foodIngredientRepository: Repository<FoodIngredient>,
  ) {}

  findAllByFood(foodId: string) {
    return this.foodIngredientRepository.find({
      where: { foodId },
      relations: ['ingredient', 'ingredient.unit'],
    });
  }

  addIngredientToFood(data: Partial<FoodIngredient>) {
    const fi = this.foodIngredientRepository.create(data);
    return this.foodIngredientRepository.save(fi);
  }

  updateIngredientInFood(id: string, data: Partial<FoodIngredient>) {
    return this.foodIngredientRepository.update(id, data);
  }

  removeIngredientFromFood(id: string) {
    return this.foodIngredientRepository.delete(id);
  }

  async setIngredientsForFood(
    foodId: string,
    ingredients: { ingredientId: string; amount: number }[],
  ) {
    // Xóa toàn bộ nguyên liệu cũ của món
    await this.foodIngredientRepository.delete({ foodId });
    // Thêm mới toàn bộ nguyên liệu
    const newLinks = ingredients.map((i) =>
      this.foodIngredientRepository.create({
        foodId,
        ingredientId: i.ingredientId,
        amount: i.amount,
      }),
    );
    return this.foodIngredientRepository.save(newLinks);
  }
}
