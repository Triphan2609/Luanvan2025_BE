import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MembershipCard,
  MembershipCardStatus,
  MembershipCardType,
} from './entities/membership-card.entity';
import {
  PointHistory,
  PointTransactionType,
} from './entities/point-history.entity';
import { Reward, RewardStatus } from './entities/reward.entity';
import { CreateMembershipCardDto } from './dto/create-membership-card.dto';
import { UpdateMembershipCardDto } from './dto/update-membership-card.dto';
import { AddPointsDto } from './dto/add-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { UpdateCardStatusDto } from './dto/update-card-status.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardsService } from './rewards.service';

@Injectable()
export class MembershipCardsService {
  constructor(
    @InjectRepository(MembershipCard)
    private membershipCardRepository: Repository<MembershipCard>,
    @InjectRepository(PointHistory)
    private pointHistoryRepository: Repository<PointHistory>,
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    private readonly rewardsService: RewardsService,
  ) {}

  // Lấy danh sách thẻ thành viên với các tùy chọn lọc
  async findAll(query: any) {
    const { page = 1, limit = 10, search, type, status, customerId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.membershipCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.customer', 'customer')
      .select([
        'card.id',
        'card.type',
        'card.points',
        'card.totalSpent',
        'card.issueDate',
        'card.expireDate',
        'card.status',
        'card.customerId',
        'customer.id',
        'customer.name',
        'customer.customer_code',
      ]);

    // Áp dụng các bộ lọc
    if (search) {
      queryBuilder.andWhere(
        '(CAST(card.id as TEXT) LIKE :search OR customer.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('card.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('card.status = :status', { status });
    }

    if (customerId) {
      queryBuilder.andWhere('card.customerId = :customerId', { customerId });
    }

    // Đếm tổng số bản ghi phù hợp với bộ lọc
    const total = await queryBuilder.getCount();

    // Lấy dữ liệu theo phân trang
    const data = await queryBuilder
      .orderBy('card.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Chuyển đổi dữ liệu đầu ra để phù hợp với frontend
    const result = data.map((card) => ({
      ...card,
      customerName: card.customer?.name,
    }));

    return {
      data: result,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  // Lấy thông tin một thẻ thành viên theo ID
  async findOne(id: number) {
    const card = await this.membershipCardRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ thành viên với ID ${id}`);
    }

    // Thêm thông tin về điểm thưởng gần đây
    const recentPoints = await this.pointHistoryRepository.find({
      where: { cardId: id },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      ...card,
      customerName: card.customer?.name,
      recentPointHistory: recentPoints,
    };
  }

  // Lấy thẻ thành viên của khách hàng theo ID khách hàng
  async findByCustomerId(customerId: string) {
    const card = await this.membershipCardRepository.findOne({
      where: { customerId },
      relations: ['customer'],
    });

    if (!card) {
      return null;
    }

    return {
      ...card,
      customerName: card.customer?.name,
    };
  }

  // Tạo thẻ thành viên mới
  async create(createMembershipCardDto: CreateMembershipCardDto) {
    // Kiểm tra xem khách hàng đã có thẻ chưa
    const existingCard = await this.membershipCardRepository.findOne({
      where: { customerId: createMembershipCardDto.customerId },
    });

    if (existingCard) {
      throw new ConflictException('Khách hàng này đã có thẻ thành viên');
    }

    // Tạo thẻ mới
    const newCard = this.membershipCardRepository.create({
      ...createMembershipCardDto,
      points: createMembershipCardDto.points || 0,
      totalSpent: createMembershipCardDto.totalSpent || 0,
      type: createMembershipCardDto.type || MembershipCardType.SILVER,
      status: createMembershipCardDto.status || MembershipCardStatus.ACTIVE,
      // Đảm bảo không lưu giá trị ngày tháng không hợp lệ
      issueDate: createMembershipCardDto.issueDate || new Date(),
      expireDate:
        createMembershipCardDto.expireDate ||
        new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    });

    // Lưu vào database
    const savedCard = await this.membershipCardRepository.save(newCard);

    // Nếu có điểm khởi tạo, tạo bản ghi lịch sử điểm
    if (savedCard.points > 0) {
      await this.pointHistoryRepository.save({
        cardId: savedCard.id,
        points: savedCard.points,
        type: PointTransactionType.ADD,
        description: 'Điểm khởi tạo khi đăng ký thẻ',
      });
    }

    return this.findOne(savedCard.id);
  }

  // Cập nhật thông tin thẻ thành viên
  async update(id: number, updateMembershipCardDto: UpdateMembershipCardDto) {
    // Kiểm tra xem thẻ có tồn tại không
    const card = await this.membershipCardRepository.findOne({
      where: { id },
    });

    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ thành viên với ID ${id}`);
    }

    // Cập nhật thông tin
    await this.membershipCardRepository.update(id, updateMembershipCardDto);

    return this.findOne(id);
  }

  // Cập nhật trạng thái thẻ
  async updateStatus(id: number, updateCardStatusDto: UpdateCardStatusDto) {
    const card = await this.membershipCardRepository.findOne({
      where: { id },
    });

    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ thành viên với ID ${id}`);
    }

    await this.membershipCardRepository.update(id, {
      status: updateCardStatusDto.status,
    });

    return {
      id,
      status: updateCardStatusDto.status,
      message: `Cập nhật trạng thái thẻ thành công`,
    };
  }

  // Cộng điểm cho thẻ
  async addPoints(id: number, addPointsDto: AddPointsDto) {
    const card = await this.membershipCardRepository.findOne({
      where: { id },
    });

    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ thành viên với ID ${id}`);
    }

    if (card.status !== MembershipCardStatus.ACTIVE) {
      throw new BadRequestException(
        'Không thể cộng điểm cho thẻ không hoạt động',
      );
    }

    // Cập nhật điểm và tổng chi tiêu (nếu có)
    const newPoints = card.points + addPointsDto.points;
    const updates: any = { points: newPoints };

    if (addPointsDto.amount) {
      updates.totalSpent = card.totalSpent + addPointsDto.amount;

      // Kiểm tra và nâng cấp hạng thẻ nếu cần
      await this.checkAndUpgradeCardType(id, updates.totalSpent);
    }

    await this.membershipCardRepository.update(id, updates);

    // Tạo bản ghi lịch sử điểm
    const pointHistory = this.pointHistoryRepository.create({
      cardId: id,
      points: addPointsDto.points,
      type: PointTransactionType.ADD,
      amount: addPointsDto.amount,
      description: addPointsDto.description || 'Cộng điểm',
    });

    await this.pointHistoryRepository.save(pointHistory);

    return {
      id,
      points: newPoints,
      addedPoints: addPointsDto.points,
      message: 'Cộng điểm thành công',
    };
  }

  // Lấy danh sách phần thưởng có thể đổi
  async getRewards() {
    return this.rewardRepository.find({
      where: { status: RewardStatus.ACTIVE },
      order: { points: 'ASC' },
    });
  }

  // Sử dụng các phương thức từ RewardsService để quản lý phần thưởng
  async getAllRewards(params) {
    return this.rewardsService.getAllRewards(params);
  }

  async getRewardById(id: number) {
    return this.rewardsService.getRewardById(id);
  }

  async createReward(
    createRewardDto: CreateRewardDto,
    image?: Express.Multer.File,
  ) {
    return this.rewardsService.createReward(createRewardDto, image);
  }

  async updateReward(
    id: number,
    updateRewardDto: UpdateRewardDto,
    image?: Express.Multer.File,
  ) {
    return this.rewardsService.updateReward(id, updateRewardDto, image);
  }

  async updateRewardStatus(id: number, status: RewardStatus) {
    return this.rewardsService.updateRewardStatus(id, status);
  }

  async deleteReward(id: number) {
    return this.rewardsService.deleteReward(id);
  }

  // Đổi điểm lấy phần thưởng
  async redeemPoints(id: number, redeemPointsDto: RedeemPointsDto) {
    const card = await this.membershipCardRepository.findOne({
      where: { id },
    });

    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ thành viên với ID ${id}`);
    }

    if (card.status !== MembershipCardStatus.ACTIVE) {
      throw new BadRequestException(
        'Không thể đổi điểm cho thẻ không hoạt động',
      );
    }

    // Kiểm tra xem có đủ điểm không
    if (card.points < redeemPointsDto.points) {
      throw new BadRequestException('Không đủ điểm để đổi phần thưởng');
    }

    // Kiểm tra phần thưởng
    const reward = await this.rewardRepository.findOne({
      where: { id: redeemPointsDto.rewardId },
    });

    if (!reward) {
      throw new NotFoundException(
        `Không tìm thấy phần thưởng với ID ${redeemPointsDto.rewardId}`,
      );
    }

    // Trừ điểm
    const newPoints = card.points - redeemPointsDto.points;
    await this.membershipCardRepository.update(id, { points: newPoints });

    // Tạo bản ghi lịch sử điểm
    const pointHistory = this.pointHistoryRepository.create({
      cardId: id,
      points: -redeemPointsDto.points,
      type: PointTransactionType.REDEEM,
      rewardId: redeemPointsDto.rewardId,
      description:
        redeemPointsDto.description ||
        `Đổi ${redeemPointsDto.points} điểm: ${reward.name}`,
    });

    await this.pointHistoryRepository.save(pointHistory);

    return {
      id,
      points: newPoints,
      redeemedPoints: redeemPointsDto.points,
      reward: reward.name,
      message: 'Đổi điểm thành công',
    };
  }

  // Lấy lịch sử điểm của thẻ
  async getPointHistory(cardId: number, query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [history, total] = await this.pointHistoryRepository.findAndCount({
      where: { cardId },
      order: { createdAt: 'DESC' },
      skip,
      take: Number(limit),
    });

    return {
      data: history,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  // Lấy thống kê về thẻ thành viên
  async getStatistics() {
    const [total, silver, gold, platinum] = await Promise.all([
      this.membershipCardRepository.count(),
      this.membershipCardRepository.count({
        where: { type: MembershipCardType.SILVER },
      }),
      this.membershipCardRepository.count({
        where: { type: MembershipCardType.GOLD },
      }),
      this.membershipCardRepository.count({
        where: { type: MembershipCardType.PLATINUM },
      }),
    ]);

    // Tính điểm trung bình
    const avgResult = await this.membershipCardRepository
      .createQueryBuilder('card')
      .select('AVG(card.points)', 'avgPoints')
      .getRawOne();

    const averagePoints = Math.round(avgResult?.avgPoints || 0);

    return {
      totalCards: total,
      silverCards: silver,
      goldCards: gold,
      platinumCards: platinum,
      averagePoints,
    };
  }

  // Xóa thẻ thành viên
  async remove(id: number) {
    // Kiểm tra xem thẻ có tồn tại không
    const card = await this.membershipCardRepository.findOne({
      where: { id },
    });

    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ thành viên với ID ${id}`);
    }

    // Xóa lịch sử điểm của thẻ trước
    await this.pointHistoryRepository.delete({ cardId: id });

    // Xóa thẻ
    await this.membershipCardRepository.delete(id);

    return {
      id,
      message: 'Xóa thẻ thành viên thành công',
    };
  }

  // Kiểm tra và nâng cấp hạng thẻ nếu cần
  private async checkAndUpgradeCardType(cardId: number, totalSpent: number) {
    // Ngưỡng chi tiêu cho từng hạng thẻ (có thể cấu hình theo yêu cầu)
    const GOLD_THRESHOLD = 5000000; // 5 triệu VND
    const PLATINUM_THRESHOLD = 20000000; // 20 triệu VND

    const card = await this.membershipCardRepository.findOne({
      where: { id: cardId },
    });

    if (!card) return;

    // Xác định hạng thẻ dựa trên tổng chi tiêu
    let newType = card.type;
    if (totalSpent >= PLATINUM_THRESHOLD) {
      newType = MembershipCardType.PLATINUM;
    } else if (totalSpent >= GOLD_THRESHOLD) {
      newType = MembershipCardType.GOLD;
    }

    // Nếu hạng thẻ thay đổi, cập nhật thẻ
    if (newType !== card.type) {
      await this.membershipCardRepository.update(cardId, { type: newType });
    }
  }
}
