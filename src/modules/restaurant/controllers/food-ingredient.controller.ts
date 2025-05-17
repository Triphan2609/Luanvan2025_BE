import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FoodIngredientService } from '../services/food-ingredient.service';

@Controller('food-ingredients')
export class FoodIngredientController {
  constructor(private readonly foodIngredientService: FoodIngredientService) {}

  @Get('food/:foodId')
  findAllByFood(@Param('foodId') foodId: string) {
    return this.foodIngredientService.findAllByFood(foodId);
  }

  @Post()
  addIngredientToFood(@Body() data: any) {
    return this.foodIngredientService.addIngredientToFood(data);
  }

  @Put(':id')
  updateIngredientInFood(@Param('id') id: string, @Body() data: any) {
    return this.foodIngredientService.updateIngredientInFood(id, data);
  }

  @Delete(':id')
  removeIngredientFromFood(@Param('id') id: string) {
    return this.foodIngredientService.removeIngredientFromFood(id);
  }

  @Put('set-for-food/:foodId')
  setIngredientsForFood(
    @Param('foodId') foodId: string,
    @Body() body: { ingredients: { ingredientId: string; amount: number }[] },
  ) {
    return this.foodIngredientService.setIngredientsForFood(
      foodId,
      body.ingredients,
    );
  }
}
