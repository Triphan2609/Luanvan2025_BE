import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Food } from './food.entity';
import { Ingredient } from './ingredient.entity';

@Entity('food_ingredients')
export class FoodIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Food)
  @JoinColumn({ name: 'food_id' })
  food: Food;

  @Column({ name: 'food_id', type: 'uuid' })
  foodId: string;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ name: 'ingredient_id', type: 'uuid' })
  ingredientId: string;

  @Column({ type: 'float' })
  amount: number; // Số lượng nguyên liệu cho 1 suất món ăn
}
