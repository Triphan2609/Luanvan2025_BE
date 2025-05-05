import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MembershipCardsService } from './membership-cards.service';
import { CreateMembershipCardDto } from './dto/create-membership-card.dto';
import { UpdateMembershipCardDto } from './dto/update-membership-card.dto';
import { UpdateCardStatusDto } from './dto/update-card-status.dto';
import { AddPointsDto } from './dto/add-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { UpdateRewardStatusDto } from './dto/update-reward-status.dto';

// Cấu hình lưu trữ file ảnh rewards
const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return callback(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
  callback(null, true);
};

const imageStorage = diskStorage({
  destination: './uploads/rewards',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `reward-${uniqueSuffix}${ext}`);
  },
});

@ApiTags('membership-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('membership-cards')
export class MembershipCardsController {
  constructor(
    private readonly membershipCardsService: MembershipCardsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thẻ thành viên với các tùy chọn lọc',
  })
  @ApiResponse({ status: 200, description: 'Danh sách thẻ thành viên' })
  async findAll(@Query() query: any) {
    return this.membershipCardsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê về thẻ thành viên' })
  @ApiResponse({ status: 200, description: 'Thống kê thẻ thành viên' })
  async getStatistics() {
    return this.membershipCardsService.getStatistics();
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Lấy danh sách phần thưởng có thể đổi điểm' })
  @ApiResponse({ status: 200, description: 'Danh sách phần thưởng' })
  async getRewards() {
    return this.membershipCardsService.getRewards();
  }

  @Get('rewards/all')
  @ApiOperation({ summary: 'Lấy tất cả phần thưởng (kể cả inactive)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả phần thưởng' })
  async getAllRewards(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.membershipCardsService.getAllRewards({
      page,
      limit,
      search,
      status,
    });
  }

  @Get('rewards/:id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của phần thưởng' })
  @ApiResponse({ status: 200, description: 'Thông tin phần thưởng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  async getRewardById(@Param('id', ParseIntPipe) id: number) {
    return this.membershipCardsService.getRewardById(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết thẻ thành viên theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin thẻ thành viên' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thẻ thành viên' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membershipCardsService.findOne(id);
  }

  @Get('customer/:customerId')
  @ApiOperation({
    summary: 'Lấy thẻ thành viên của khách hàng theo ID khách hàng',
  })
  @ApiResponse({ status: 200, description: 'Thông tin thẻ thành viên' })
  async findByCustomerId(@Param('customerId') customerId: string) {
    return this.membershipCardsService.findByCustomerId(customerId);
  }

  @Get(':id/points/history')
  @ApiOperation({ summary: 'Lấy lịch sử điểm thưởng của thẻ thành viên' })
  @ApiResponse({ status: 200, description: 'Lịch sử điểm thưởng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thẻ thành viên' })
  async getPointHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
  ) {
    return this.membershipCardsService.getPointHistory(id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo thẻ thành viên mới' })
  @ApiResponse({ status: 201, description: 'Thẻ thành viên đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Khách hàng đã có thẻ thành viên' })
  async create(@Body() createMembershipCardDto: CreateMembershipCardDto) {
    return this.membershipCardsService.create(createMembershipCardDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin thẻ thành viên' })
  @ApiResponse({ status: 200, description: 'Thẻ thành viên đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thẻ thành viên' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMembershipCardDto: UpdateMembershipCardDto,
  ) {
    return this.membershipCardsService.update(id, updateMembershipCardDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái thẻ thành viên' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thẻ thành viên' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCardStatusDto: UpdateCardStatusDto,
  ) {
    return this.membershipCardsService.updateStatus(id, updateCardStatusDto);
  }

  @Post(':id/points/add')
  @ApiOperation({ summary: 'Cộng điểm cho thẻ thành viên' })
  @ApiResponse({ status: 200, description: 'Điểm đã được cộng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thẻ thành viên' })
  @ApiResponse({
    status: 400,
    description: 'Không thể cộng điểm cho thẻ không hoạt động',
  })
  async addPoints(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPointsDto: AddPointsDto,
  ) {
    return this.membershipCardsService.addPoints(id, addPointsDto);
  }

  @Post('rewards')
  @ApiOperation({ summary: 'Tạo phần thưởng mới' })
  @ApiResponse({ status: 201, description: 'Phần thưởng đã được tạo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async createReward(
    @Body() createRewardDto: CreateRewardDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.membershipCardsService.createReward(createRewardDto, image);
  }

  @Patch('rewards/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin phần thưởng' })
  @ApiResponse({ status: 200, description: 'Phần thưởng đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async updateReward(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRewardDto: UpdateRewardDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.membershipCardsService.updateReward(id, updateRewardDto, image);
  }

  @Patch('rewards/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái phần thưởng' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  async updateRewardStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateRewardStatusDto,
  ) {
    return this.membershipCardsService.updateRewardStatus(
      id,
      updateStatusDto.status,
    );
  }

  @Delete('rewards/:id')
  @ApiOperation({ summary: 'Xóa phần thưởng' })
  @ApiResponse({ status: 200, description: 'Phần thưởng đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  async deleteReward(@Param('id', ParseIntPipe) id: number) {
    return this.membershipCardsService.deleteReward(id);
  }

  @Post(':id/points/redeem')
  @ApiOperation({ summary: 'Đổi điểm lấy phần thưởng' })
  @ApiResponse({ status: 200, description: 'Đổi điểm thành công' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thẻ thành viên hoặc phần thưởng',
  })
  @ApiResponse({
    status: 400,
    description: 'Không đủ điểm hoặc thẻ không hoạt động',
  })
  async redeemPoints(
    @Param('id', ParseIntPipe) id: number,
    @Body() redeemPointsDto: RedeemPointsDto,
  ) {
    return this.membershipCardsService.redeemPoints(id, redeemPointsDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thẻ thành viên' })
  @ApiResponse({ status: 200, description: 'Thẻ thành viên đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thẻ thành viên' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.membershipCardsService.remove(id);
  }
}
