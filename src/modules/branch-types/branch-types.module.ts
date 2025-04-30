import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchTypesService } from './branch-types.service';
import { BranchTypesController } from './branch-types.controller';
import { BranchType } from './entities/branch-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BranchType])],
  controllers: [BranchTypesController],
  providers: [BranchTypesService],
  exports: [TypeOrmModule], // Xuất TypeOrmModule để các module khác có thể sử dụng BranchTypeRepository
})
export class BranchTypesModule {}
