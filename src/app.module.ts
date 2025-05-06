import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module'; // Import AccountsModule
import { RolesModule } from './modules/roles/roles.module';
import { BranchesModule } from './modules/branches/branches.module';
import { BranchTypesModule } from './modules/branch-types/branch-types.module';
import { ServicesModule } from './modules/services/services.module';
import { AreasModule } from './modules/areas/areas.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RolesEmployeeModule } from './modules/roles_employee/roles-employee.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CustomersModule } from './modules/customers/customers.module';
import { MembershipCardsModule } from './modules/membership-cards/membership-cards.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { StuffModule } from './modules/stuff/stuff.module';
import { AmenitiesModule } from './modules/amenities/amenities.module';
import { FloorsModule } from './modules/floors/floors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>(
          'DB_DATABASE',
          'hotel_restaurant_db',
        ),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
        autoLoadEntities: true,
        dateStrings: true,
        extra: {
          connectionLimit: 10,
          charset: 'utf8mb4_unicode_ci',
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AccountsModule,
    RolesModule,
    BranchesModule,
    BranchTypesModule,
    ServicesModule,
    AreasModule,
    EmployeesModule,
    DepartmentsModule,
    RolesEmployeeModule,
    ShiftsModule,
    CustomersModule,
    MembershipCardsModule,
    RoomTypesModule,
    RoomsModule,
    StuffModule,
    AmenitiesModule,
    FloorsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
