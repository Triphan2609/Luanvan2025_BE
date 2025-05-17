import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import các module con đúng chuẩn
import { MenuModule } from './menu/menu.module';
import { ServicesModule } from '../services/services.module';

// Controllers
import { FoodCategoryController } from './controllers/food-category.controller';
import { FoodController } from './controllers/food.controller';
import { TableController } from './controllers/table.controller';
import { ReservationController } from './controllers/reservation.controller';
import { AreaController } from './controllers/area.controller';
import { IngredientController } from './controllers/ingredient.controller';
import { FoodIngredientController } from './controllers/food-ingredient.controller';
import { UnitController } from './controllers/unit.controller';

// Services
import { FoodCategoryService } from './services/food-category.service';
import { FoodService } from './services/food.service';
import { TableService } from './services/table.service';
import { ReservationService } from './services/reservation.service';
import { AreaService } from './services/area.service';
import { IngredientService } from './services/ingredient.service';
import { FoodIngredientService } from './services/food-ingredient.service';
import { UnitService } from './services/unit.service';

// Entities
import { FoodCategory } from './entities/food-category.entity';
import { Food } from './entities/food.entity';
import { Table } from './entities/table.entity';
import { Reservation } from './entities/reservation.entity';
import { Area } from './entities/area.entity';
import { Ingredient } from './entities/ingredient.entity';
import { FoodIngredient } from './entities/food-ingredient.entity';
import { Unit } from './entities/unit.entity';

// Order imports
import { OrderController } from './order/order.controller';
import { OrderService } from './order/order.service';
import { RestaurantOrder } from './order/order.entity';
import { OrderItem } from './order/order-item.entity';

@Module({
  imports: [
    MenuModule, // Sử dụng module menu đúng chuẩn
    TypeOrmModule.forFeature([
      FoodCategory,
      Food,
      Table,
      Reservation,
      Area,
      Ingredient,
      FoodIngredient,
      Unit,
      RestaurantOrder,
      OrderItem,
    ]),
    ServicesModule,
  ],
  controllers: [
    FoodCategoryController,
    FoodController,
    TableController,
    ReservationController,
    AreaController,
    IngredientController,
    FoodIngredientController,
    UnitController,
    OrderController,
  ],
  providers: [
    FoodCategoryService,
    FoodService,
    TableService,
    ReservationService,
    AreaService,
    IngredientService,
    FoodIngredientService,
    UnitService,
    OrderService,
  ],
  exports: [
    FoodCategoryService,
    FoodService,
    TableService,
    ReservationService,
    AreaService,
    IngredientService,
    FoodIngredientService,
    UnitService,
    OrderService,
  ],
})
export class RestaurantModule {}
