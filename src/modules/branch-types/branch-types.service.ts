import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchType } from './entities/branch-type.entity';
import { CreateBranchTypeDto } from './dto/create-branch-type.dto';
import { UpdateBranchTypeDto } from './dto/update-branch-type.dto';

@Injectable()
export class BranchTypesService {
  constructor(
    @InjectRepository(BranchType)
    private readonly branchTypeRepository: Repository<BranchType>,
  ) {}

  async findAll(): Promise<BranchType[]> {
    return this.branchTypeRepository.find();
  }

  async findOne(id: number): Promise<BranchType> {
    const branchType = await this.branchTypeRepository.findOne({
      where: { id },
    });
    if (!branchType) {
      throw new NotFoundException('Loại chi nhánh không tồn tại');
    }
    return branchType;
  }

  async create(createBranchTypeDto: CreateBranchTypeDto): Promise<BranchType> {
    const branchType = this.branchTypeRepository.create(createBranchTypeDto);
    return this.branchTypeRepository.save(branchType);
  }

  async update(
    id: number,
    updateBranchTypeDto: UpdateBranchTypeDto,
  ): Promise<BranchType> {
    const existingBranchType = await this.branchTypeRepository.findOne({
      where: { id },
    });

    if (!existingBranchType) {
      throw new NotFoundException(`Loại chi nhánh với ID ${id} không tồn tại`);
    }

    // Kiểm tra nếu `key_name` bị gửi trong payload
    if (updateBranchTypeDto.key_name) {
      throw new BadRequestException(
        'Không được phép thay đổi mã loại chi nhánh (key_name)',
      );
    }

    // Cập nhật các trường khác
    Object.assign(existingBranchType, updateBranchTypeDto);
    return this.branchTypeRepository.save(existingBranchType);
  }

  async remove(id: number): Promise<void> {
    const branchType = await this.findOne(id);
    await this.branchTypeRepository.remove(branchType);
  }
}
