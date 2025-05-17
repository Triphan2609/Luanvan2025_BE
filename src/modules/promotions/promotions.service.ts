import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async create(data: Partial<Promotion>): Promise<Promotion> {
    const promo = this.promotionRepository.create(data);
    return this.promotionRepository.save(promo);
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionRepository.find({ relations: ['branch', 'menus'] });
  }

  async findOne(id: number): Promise<Promotion> {
    const promo = await this.promotionRepository.findOne({
      where: { id },
      relations: ['branch', 'menus'],
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async update(id: number, data: Partial<Promotion>): Promise<Promotion> {
    await this.promotionRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.promotionRepository.delete(id);
  }
}
