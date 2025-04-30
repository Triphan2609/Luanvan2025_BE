import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { Branch } from './entities/branch.entity';
import { BranchTypesModule } from '../branch-types/branch-types.module'; // Import BranchTypesModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch]),
    BranchTypesModule, // Thêm BranchTypesModule vào imports
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
