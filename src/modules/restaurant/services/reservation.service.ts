import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    // Generate a reservation number
    const reservationNumber = this.generateReservationNumber();

    // Create a new reservation entity
    const reservation = new Reservation();

    // Copy properties from DTO to entity
    Object.assign(reservation, {
      ...createReservationDto,
      reservationNumber,
    });

    return this.reservationRepository.save(reservation);
  }

  async findAll(
    query: Record<string, any>,
  ): Promise<{ data: Reservation[]; total: number }> {
    const { page = 1, limit = 10, branchId, status, date, customerId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.reservationRepository.createQueryBuilder('reservation');

    // Add relationships
    queryBuilder.leftJoinAndSelect('reservation.customer', 'customer');
    queryBuilder.leftJoinAndSelect('reservation.tables', 'tables');

    // Apply filters
    if (branchId) {
      queryBuilder.andWhere('reservation.branchId = :branchId', { branchId });
    }

    if (status) {
      queryBuilder.andWhere('reservation.status = :status', { status });
    }

    if (date) {
      queryBuilder.andWhere('DATE(reservation.reservationDate) = :date', {
        date,
      });
    }

    if (customerId) {
      queryBuilder.andWhere('reservation.customerId = :customerId', {
        customerId,
      });
    }

    // Count total items for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Order by reservation date and time descending (newest first)
    queryBuilder.orderBy('reservation.reservationDate', 'DESC');
    queryBuilder.addOrderBy('reservation.reservationTime', 'DESC');

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['customer', 'tables'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id);

    // Update the reservation properties
    Object.assign(reservation, updateReservationDto);

    return this.reservationRepository.save(reservation);
  }

  async remove(id: string): Promise<void> {
    const result = await this.reservationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
  }

  private generateReservationNumber(): string {
    // Generate a unique reservation number
    // Format: RES-YYYYMMDD-XXXXX (where XXXXX is a random 5-digit number)
    const date = new Date();
    const dateStr =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(10000 + Math.random() * 90000);

    return `RES-${dateStr}-${randomNum}`;
  }
}
