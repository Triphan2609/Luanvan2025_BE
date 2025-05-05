import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { UpdateRewardStatusDto } from './dto/update-reward-status.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Cấu hình lưu trữ file ảnh
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

@ApiTags('membership-cards/rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('membership-cards/rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('all')
  @ApiOperation({ summary: 'Lấy tất cả phần thưởng (kể cả inactive)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả phần thưởng' })
  async getAllRewards(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.rewardsService.getAllRewards({
      page,
      limit,
      search,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của phần thưởng' })
  @ApiResponse({ status: 200, description: 'Thông tin phần thưởng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  async getRewardById(@Param('id', ParseIntPipe) id: number) {
    return this.rewardsService.getRewardById(id);
  }

  @Post()
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
    return this.rewardsService.createReward(createRewardDto, image);
  }

  @Patch(':id')
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
    return this.rewardsService.updateReward(id, updateRewardDto, image);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái phần thưởng' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  async updateRewardStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateRewardStatusDto,
  ) {
    return this.rewardsService.updateRewardStatus(id, updateStatusDto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phần thưởng' })
  @ApiResponse({ status: 200, description: 'Phần thưởng đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phần thưởng' })
  async deleteReward(@Param('id', ParseIntPipe) id: number) {
    return this.rewardsService.deleteReward(id);
  }
}
