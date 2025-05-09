import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { MenuController } from './controllers/menu.controller';
import { FoodCategoryController } from './controllers/food-category.controller';
import { FoodController } from './controllers/food.controller';
import { TableController } from './controllers/table.controller';
import { ReservationController } from './controllers/reservation.controller';
import { AreaController } from './controllers/area.controller';

// Services
import { MenuService } from './services/menu.service';
import { FoodCategoryService } from './services/food-category.service';
import { FoodService } from './services/food.service';
import { TableService } from './services/table.service';
import { ReservationService } from './services/reservation.service';
import { AreaService } from './services/area.service';

// Entities
import { Menu } from './entities/menu.entity';
import { FoodCategory } from './entities/food-category.entity';
import { Food } from './entities/food.entity';
import { Table } from './entities/table.entity';
import { Reservation } from './entities/reservation.entity';
import { Area } from './entities/area.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Menu,
      FoodCategory,
      Food,
      Table,
      Reservation,
      Area,
    ]),
  ],
  controllers: [
    MenuController,
    FoodCategoryController,
    FoodController,
    TableController,
    ReservationController,
    AreaController,
  ],
  providers: [
    MenuService,
    FoodCategoryService,
    FoodService,
    TableService,
    ReservationService,
    AreaService,
  ],
  exports: [
    MenuService,
    FoodCategoryService,
    FoodService,
    TableService,
    ReservationService,
    AreaService,
  ],
})
export class RestaurantModule {}
