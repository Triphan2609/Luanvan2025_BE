import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Amenity } from './entities/amenity.entity';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectRepository(Amenity)
    private amenitiesRepository: Repository<Amenity>,
  ) {}

  async create(createAmenityDto: CreateAmenityDto): Promise<Amenity> {
    const amenity = this.amenitiesRepository.create(createAmenityDto);
    return this.amenitiesRepository.save(amenity);
  }

  async findAll(): Promise<Amenity[]> {
    return this.amenitiesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Amenity> {
    const amenity = await this.amenitiesRepository.findOne({
      where: { id, isActive: true },
    });

    if (!amenity) {
      throw new NotFoundException(`Amenity with ID ${id} not found`);
    }

    return amenity;
  }

  async update(
    id: number,
    updateAmenityDto: UpdateAmenityDto,
  ): Promise<Amenity> {
    const amenity = await this.findOne(id);

    Object.assign(amenity, updateAmenityDto);
    return this.amenitiesRepository.save(amenity);
  }

  async remove(id: number): Promise<void> {
    const amenity = await this.findOne(id);

    // Soft delete by setting isActive to false
    amenity.isActive = false;
    await this.amenitiesRepository.save(amenity);
  }
}
