import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { Room } from './entities/room.entity';
import { RoomTypesModule } from '../room-types/room-types.module';
import { StuffModule } from '../stuff/stuff.module';
import { Item } from '../stuff/entities/item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, Item]),
    RoomTypesModule,
    StuffModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
