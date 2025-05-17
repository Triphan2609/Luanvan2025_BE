import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { Menu } from './menu.entity';
import { Food } from '../../restaurant/entities/food.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Menu, Food, Branch])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
