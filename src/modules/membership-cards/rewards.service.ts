import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Reward, RewardStatus } from './entities/reward.entity';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
  ) {}

  // Lấy tất cả phần thưởng
  async getAllRewards({
    page = 1,
    limit = 10,
    search = '',
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    // Xử lý pagination
    const take = +limit;
    const skip = (page - 1) * take;

    // Xây dựng điều kiện tìm kiếm
    const where: FindOptionsWhere<Reward> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (
      status &&
      Object.values(RewardStatus).includes(status as RewardStatus)
    ) {
      where.status = status as RewardStatus;
    }

    // Thực hiện truy vấn
    const [data, total] = await this.rewardRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    return {
      data,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / take),
    };
  }

  // Lấy thông tin chi tiết phần thưởng
  async getRewardById(id: number) {
    const reward = await this.rewardRepository.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException(`Không tìm thấy phần thưởng với ID ${id}`);
    }
    return reward;
  }

  // Tạo phần thưởng mới
  async createReward(
    createRewardDto: CreateRewardDto,
    image?: Express.Multer.File,
  ) {
    try {
      // Tạo đối tượng reward từ DTO
      const reward = new Reward();
      reward.name = createRewardDto.name;
      reward.points = createRewardDto.points;
      reward.description = createRewardDto.description || '';
      reward.status = createRewardDto.status || RewardStatus.ACTIVE;

      // Nếu có upload ảnh thì lưu đường dẫn
      if (image) {
        reward.image = `/uploads/rewards/${image.filename}`;
      } else {
        reward.image = '';
      }

      await this.rewardRepository.save(reward);
      return reward;
    } catch (error) {
      // Nếu có lỗi và đã upload file thì xóa file
      if (image) {
        try {
          await unlink(join(process.cwd(), 'uploads/rewards', image.filename));
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      throw error;
    }
  }

  // Cập nhật thông tin phần thưởng
  async updateReward(
    id: number,
    updateRewardDto: UpdateRewardDto,
    image?: Express.Multer.File,
  ) {
    const reward = await this.getRewardById(id);

    // Nếu có upload ảnh mới
    if (image) {
      // Lưu đường dẫn ảnh mới
      updateRewardDto.image = `/uploads/rewards/${image.filename}`;

      // Xóa ảnh cũ nếu có
      if (reward.image) {
        const oldImagePath = reward.image.replace('/uploads/', '');
        try {
          await unlink(join(process.cwd(), oldImagePath));
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    }

    // Cập nhật phần thưởng
    const updatedReward = this.rewardRepository.merge(reward, updateRewardDto);
    await this.rewardRepository.save(updatedReward);

    return updatedReward;
  }

  // Cập nhật trạng thái phần thưởng
  async updateRewardStatus(id: number, status: RewardStatus) {
    const reward = await this.getRewardById(id);

    reward.status = status;
    await this.rewardRepository.save(reward);

    return reward;
  }

  // Xóa phần thưởng
  async deleteReward(id: number) {
    const reward = await this.getRewardById(id);

    // Xóa file ảnh nếu có
    if (reward.image) {
      const imagePath = reward.image.replace('/uploads/', '');
      try {
        await unlink(join(process.cwd(), imagePath));
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    // Xóa phần thưởng từ database
    await this.rewardRepository.remove(reward);

    return { message: 'Phần thưởng đã được xóa thành công' };
  }
}
