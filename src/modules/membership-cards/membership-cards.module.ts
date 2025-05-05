import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipCardsController } from './membership-cards.controller';
import { MembershipCardsService } from './membership-cards.service';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { MembershipCard } from './entities/membership-card.entity';
import { PointHistory } from './entities/point-history.entity';
import { Reward } from './entities/reward.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([MembershipCard, PointHistory, Reward]),
    MulterModule.register({
      dest: './uploads',
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [MembershipCardsController, RewardsController],
  providers: [MembershipCardsService, RewardsService],
  exports: [MembershipCardsService, RewardsService],
})
export class MembershipCardsModule {}
