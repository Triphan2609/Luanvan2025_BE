import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { BranchType } from '../branch-types/entities/branch-type.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(BranchType)
    private readonly branchTypeRepository: Repository<BranchType>,
  ) {}

  async findAll(): Promise<Branch[]> {
    return this.branchRepository.find();
  }

  async findOne(id: number): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Chi nhánh không tồn tại');
    }
    return branch;
  }

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    // Kiểm tra xem branch_code đã tồn tại chưa
    const existingBranch = await this.branchRepository.findOne({
      where: { branch_code: createBranchDto.branch_code },
    });
    if (existingBranch) {
      throw new BadRequestException('Mã chi nhánh đã tồn tại');
    }

    // Kiểm tra loại chi nhánh
    const branchType = await this.branchTypeRepository.findOne({
      where: { id: createBranchDto.branch_type_id },
    });
    if (!branchType) {
      throw new NotFoundException('Loại chi nhánh không tồn tại');
    }

    // Tạo chi nhánh mới
    const branch = this.branchRepository.create({
      ...createBranchDto,
      branchType,
    });
    return this.branchRepository.save(branch);
  }

  async update(id: number, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);

    // Kiểm tra loại chi nhánh nếu có
    if (updateBranchDto.branch_type_id) {
      const branchType = await this.branchTypeRepository.findOne({
        where: { id: updateBranchDto.branch_type_id },
      });
      if (!branchType) {
        throw new NotFoundException('Loại chi nhánh không tồn tại');
      }
      branch.branchType = branchType;
    }

    // Cập nhật các trường khác (ngoại trừ branch_code)
    Object.assign(branch, updateBranchDto);
    return this.branchRepository.save(branch);
  }

  async remove(id: number): Promise<void> {
    const branch = await this.findOne(id);
    await this.branchRepository.remove(branch);
  }

  async updateStatus(id: number, status: 'active' | 'inactive'): Promise<any> {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Chi nhánh với ID ${id} không tồn tại`);
    }
    branch.status = status; // Đảm bảo status là "active" hoặc "inactive"
    return this.branchRepository.save(branch);
  }
}
