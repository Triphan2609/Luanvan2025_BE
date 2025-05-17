import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Food } from '../../restaurant/entities/food.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
    @InjectRepository(Food)
    private foodRepository: Repository<Food>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async create(createMenuDto: CreateMenuDto): Promise<Menu> {
    const { branchId, foodIds, ...menuData } = createMenuDto;

    // Kiểm tra branch tồn tại
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    // Kiểm tra foods tồn tại
    const foods = await this.foodRepository.findByIds(foodIds);
    if (foods.length !== foodIds.length) {
      throw new NotFoundException('Some foods not found');
    }

    const menu = this.menuRepository.create({
      ...menuData,
      branch,
      foods,
    });

    return this.menuRepository.save(menu);
  }

  async findAll(type?: string, season?: string): Promise<Menu[]> {
    const query = this.menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.branch', 'branch')
      .leftJoinAndSelect('menu.foods', 'foods');
    if (type) {
      query.andWhere('menu.type = :type', { type });
    }
    if (season) {
      query.andWhere('menu.season = :season', { season });
    }
    return query.getMany();
  }

  async findOne(id: string): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: ['branch', 'foods'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    return menu;
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const { branchId, foodIds, ...menuData } = updateMenuDto;
    const menu = await this.findOne(id);

    if (branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }
      menu.branch = branch;
    }

    if (foodIds) {
      const foods = await this.foodRepository.findByIds(foodIds);
      if (foods.length !== foodIds.length) {
        throw new NotFoundException('Some foods not found');
      }
      menu.foods = foods;
    }

    Object.assign(menu, menuData);
    return this.menuRepository.save(menu);
  }

  async remove(id: string): Promise<void> {
    const menu = await this.findOne(id);
    await this.menuRepository.remove(menu);
  }

  async updateFoodOrder(id: string, foodIds: string[]): Promise<Menu> {
    const menu = await this.findOne(id);
    const foods = await this.foodRepository.findByIds(foodIds);

    if (foods.length !== foodIds.length) {
      throw new NotFoundException('Some foods not found');
    }

    // Sắp xếp lại foods theo đúng thứ tự foodIds
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    menu.foods = foodIds
      .map((fid) => foodMap.get(fid))
      .filter((f): f is Food => !!f);
    await this.menuRepository.save(menu);
    // Đảm bảo khi trả về cũng đúng thứ tự
    menu.foods = foodIds
      .map((fid) => foodMap.get(fid))
      .filter((f): f is Food => !!f);
    return menu;
  }
}
