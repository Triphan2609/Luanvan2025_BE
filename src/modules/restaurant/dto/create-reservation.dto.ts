import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  IsDate,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation.entity';

export class CreateReservationDto {
  @ApiProperty({ description: 'Reservation date' })
  @IsDate()
  @Type(() => Date)
  reservationDate: Date;

  @ApiProperty({ description: 'Reservation time (e.g., "18:30")' })
  @IsString()
  reservationTime: string;

  @ApiProperty({ description: 'Number of guests' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  guestCount: number;

  @ApiProperty({ description: 'Special requests or notes', required: false })
  @IsString()
  @IsOptional()
  specialRequests?: string;

  @ApiProperty({
    description: 'Status of the reservation',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'Table IDs for the reservation',
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  tableIds: number[];

  @ApiProperty({
    description: 'Estimated duration in minutes',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(15)
  @Type(() => Number)
  estimatedDuration?: number;

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId: string;
}
