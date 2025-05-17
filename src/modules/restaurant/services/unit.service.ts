import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  findAll() {
    return this.unitRepository.find();
  }

  findOne(id: string) {
    return this.unitRepository.findOne({ where: { id } });
  }

  create(data: Partial<Unit>) {
    const unit = this.unitRepository.create(data);
    return this.unitRepository.save(unit);
  }

  update(id: string, data: Partial<Unit>) {
    return this.unitRepository.update(id, data);
  }

  remove(id: string) {
    return this.unitRepository.delete(id);
  }
}
