import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository, In } from 'typeorm';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
} from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { RoomsService } from '../rooms/rooms.service';
import { CustomersService } from '../customers/customers.service';
import { RoomStatus } from '../rooms/entities/room.entity';
import { PaymentsService } from '../payments/payments.service';

// Add this interface after imports
interface DailyAvailability {
  date: Date;
  available: boolean;
  booking: Booking | null;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private roomsService: RoomsService,
    private customersService: CustomersService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    // Check if room exists and is available
    const room = await this.roomsService.findOne(createBookingDto.roomId);

    // Chỉ kiểm tra các trạng thái không cho phép đặt phòng (Maintenance, Cleaning)
    const unavailableStatuses = [RoomStatus.MAINTENANCE, RoomStatus.CLEANING];

    if (unavailableStatuses.includes(room.status)) {
      throw new BadRequestException(
        `Room ${room.roomCode} is not available for booking (${room.status})`,
      );
    }

    // Check if room is already booked for the requested dates
    const conflictingBookings = await this.checkRoomAvailability(
      createBookingDto.roomId,
      new Date(createBookingDto.checkInDate),
      new Date(createBookingDto.checkOutDate),
    );

    if (conflictingBookings.length > 0) {
      throw new ConflictException(
        `Room ${room.roomCode} is already booked for the requested dates`,
      );
    }

    let customerId = createBookingDto.customerId;

    // Xử lý trường hợp đặt phòng cho khách vãng lai
    if (createBookingDto.isWalkInCustomer && createBookingDto.customerTemp) {
      try {
        // Kiểm tra xem khách hàng có số điện thoại này đã tồn tại chưa
        try {
          const existingCustomer = await this.customersService.findByPhone(
            createBookingDto.customerTemp.phone,
          );

          // Nếu đã tồn tại, sử dụng luôn khách hàng này
          customerId = existingCustomer.id;
        } catch (error) {
          // Nếu không tìm thấy khách hàng với số điện thoại này
          // Kiểm tra xem có lưu thông tin khách hàng hay không
          const shouldSaveCustomer = createBookingDto.saveCustomer !== false;

          if (shouldSaveCustomer) {
            // Tạo một khách hàng tạm thời từ thông tin nhập vào và lưu vào hệ thống
            const walkInCustomer =
              await this.customersService.createWalkInCustomer({
                name: createBookingDto.customerTemp.name,
                phone: createBookingDto.customerTemp.phone,
                idCard: createBookingDto.customerTemp.idCard,
                branchId: createBookingDto.branchId,
                type: 'regular', // Mặc định là khách hàng thường
                isWalkIn: true, // Đánh dấu là khách vãng lai
              });

            // Lấy ID của khách hàng vừa tạo
            customerId = walkInCustomer.id;
          } else {
            // Tạo một đối tượng Customer tạm thời không lưu vào database
            // Để đảm bảo có customerId cho đặt phòng
            const tempCustomer = this.customersService.createTempCustomer({
              name: createBookingDto.customerTemp.name,
              phone: createBookingDto.customerTemp.phone,
              idCard: createBookingDto.customerTemp.idCard,
              branchId: createBookingDto.branchId,
            });

            customerId = tempCustomer.id;
            console.log(
              `Created temporary customer for booking with ID: ${customerId}`,
            );
          }
        }
      } catch (error) {
        throw new BadRequestException(
          `Failed to process walk-in customer: ${error.message}`,
        );
      }
    } else if (!customerId) {
      throw new BadRequestException(
        `Customer ID is required for non-walk-in bookings`,
      );
    }

    // Verify customer exists
    const customer = await this.customersService.findOne(customerId);

    // Create booking
    const booking = this.bookingsRepository.create({
      ...createBookingDto,
      customerId: customerId, // Sử dụng ID khách hàng đã xác định ở trên
    });

    // Update room status to Booked ONLY if check-in date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const checkInDate = new Date(createBookingDto.checkInDate);
    checkInDate.setHours(0, 0, 0, 0); // Reset time to start of day

    // Chỉ cập nhật trạng thái phòng sang Booked nếu ngày check-in là ngày hôm nay
    if (checkInDate.getTime() === today.getTime()) {
      await this.roomsService.updateStatus(createBookingDto.roomId, 'Booked');
    }
    // Nếu đặt phòng trong tương lai, phòng vẫn Available cho đến ngày check-in

    // Update customer booking statistics
    await this.customersService.updateBookingStats(
      customerId,
      parseFloat(createBookingDto.totalAmount.toString()),
    );

    return await this.bookingsRepository.save(booking);
  }

  async findAll(queryParams: QueryBookingDto): Promise<[Booking[], number]> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      customerId,
      roomId,
      branchId,
      status,
      paymentStatus,
      source,
      search,
      checkInDateStart,
      checkInDateEnd,
      checkOutDateStart,
      checkOutDateEnd,
      floorId,
      roomTypeId,
    } = queryParams;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      where: {},
      relations: [
        'customer',
        'room',
        'room.roomType',
        'room.floorDetails',
        'branch',
      ],
      order: { [sortBy]: sortOrder },
      skip,
      take: limit,
    };

    // Add filters
    if (customerId) {
      query.where.customerId = customerId;
    }

    if (roomId) {
      query.where.roomId = roomId;
    }

    if (branchId) {
      query.where.branchId = branchId;
    }

    if (status) {
      query.where.status = status;
    }

    if (paymentStatus) {
      query.where.paymentStatus = paymentStatus;
    }

    if (source) {
      query.where.source = source;
    }

    // Date range filters
    if (checkInDateStart && checkInDateEnd) {
      query.where.checkInDate = Between(
        new Date(checkInDateStart),
        new Date(checkInDateEnd),
      );
    } else if (checkInDateStart) {
      query.where.checkInDate = new Date(checkInDateStart);
    }

    if (checkOutDateStart && checkOutDateEnd) {
      query.where.checkOutDate = Between(
        new Date(checkOutDateStart),
        new Date(checkOutDateEnd),
      );
    } else if (checkOutDateStart) {
      query.where.checkOutDate = new Date(checkOutDateStart);
    }

    // Room type and floor filters
    if (roomTypeId || floorId) {
      query.join = {
        alias: 'booking',
        innerJoin: {
          room: 'booking.room',
        },
      };

      if (roomTypeId) {
        query.where['room.roomTypeId'] = roomTypeId;
      }

      if (floorId) {
        query.where['room.floorId'] = floorId;
      }
    }

    // Search filter
    if (search) {
      query.where = [
        { bookingCode: ILike(`%${search}%`) },
        { 'customer.name': ILike(`%${search}%`) },
        { 'customer.phone': ILike(`%${search}%`) },
        { 'room.roomCode': ILike(`%${search}%`) },
      ];
    }

    return await this.bookingsRepository.findAndCount(query);
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'room',
        'room.roomType',
        'room.floorDetails',
        'branch',
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async findByCode(bookingCode: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { bookingCode },
      relations: [
        'customer',
        'room',
        'room.roomType',
        'room.floorDetails',
        'branch',
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with code ${bookingCode} not found`);
    }

    return booking;
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Handle status changes
    if (updateBookingDto.status && updateBookingDto.status !== booking.status) {
      await this.handleStatusChange(
        booking,
        updateBookingDto.status,
        updateBookingDto,
      );
    }

    // If updating room or dates, check availability
    if (
      (updateBookingDto.roomId && updateBookingDto.roomId !== booking.roomId) ||
      updateBookingDto.checkInDate ||
      updateBookingDto.checkOutDate
    ) {
      const roomId = updateBookingDto.roomId || booking.roomId;
      const checkInDate = updateBookingDto.checkInDate
        ? new Date(updateBookingDto.checkInDate)
        : booking.checkInDate;
      const checkOutDate = updateBookingDto.checkOutDate
        ? new Date(updateBookingDto.checkOutDate)
        : booking.checkOutDate;

      // Check if new room/dates are available
      const conflictingBookings = await this.checkRoomAvailability(
        roomId,
        checkInDate,
        checkOutDate,
        id, // Exclude current booking from check
      );

      if (conflictingBookings.length > 0) {
        throw new ConflictException(
          `Room is already booked for the requested dates`,
        );
      }

      // If changing room, update statuses
      if (
        updateBookingDto.roomId &&
        updateBookingDto.roomId !== booking.roomId
      ) {
        // Set old room to Available
        await this.roomsService.updateStatus(booking.roomId, 'Available');

        // Set new room to Booked
        await this.roomsService.updateStatus(updateBookingDto.roomId, 'Booked');
      }
    }

    // Update booking
    Object.assign(booking, updateBookingDto);
    return await this.bookingsRepository.save(booking);
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);

    // Make room available again if booking is not checked-out or cancelled
    if (
      booking.status !== BookingStatus.CHECKED_OUT &&
      booking.status !== BookingStatus.CANCELLED
    ) {
      await this.roomsService.updateStatus(booking.roomId, 'Available');
    }

    await this.bookingsRepository.remove(booking);
  }

  async checkIn(id: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Only confirmed bookings can be checked in. Current status: ${booking.status}`,
      );
    }

    booking.status = BookingStatus.CHECKED_IN;
    booking.checkInTime = new Date();
    return await this.bookingsRepository.save(booking);
  }

  async checkOut(id: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Only checked-in bookings can be checked out. Current status: ${booking.status}`,
      );
    }

    booking.status = BookingStatus.CHECKED_OUT;
    booking.checkOutTime = new Date();

    // Make room available again, but mark it for cleaning
    await this.roomsService.updateStatus(booking.roomId, 'Cleaning');

    return await this.bookingsRepository.save(booking);
  }

  async confirm(id: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Only pending bookings can be confirmed. Current status: ${booking.status}`,
      );
    }

    booking.status = BookingStatus.CONFIRMED;
    return await this.bookingsRepository.save(booking);
  }

  async cancel(id: string, reason: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (
      booking.status === BookingStatus.CHECKED_OUT ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot cancel booking with status: ${booking.status}`,
      );
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason;

    // Make room available again
    await this.roomsService.updateStatus(booking.roomId, 'Available');

    return await this.bookingsRepository.save(booking);
  }

  async reject(id: string, reason: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Only pending bookings can be rejected. Current status: ${booking.status}`,
      );
    }

    booking.status = BookingStatus.REJECTED;
    booking.rejectReason = reason;

    // Make room available again
    await this.roomsService.updateStatus(booking.roomId, 'Available');

    return await this.bookingsRepository.save(booking);
  }

  // Helper methods
  private async checkRoomAvailability(
    roomId: number,
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: string,
  ): Promise<Booking[]> {
    const query = {
      where: {
        roomId,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.CHECKED_IN,
        ]),
      },
    };

    // Get all active bookings for this room
    const bookings = await this.bookingsRepository.find(query);

    // Chuẩn hóa ngày kiểm tra
    const checkInWithoutTime = new Date(
      checkInDate.getFullYear(),
      checkInDate.getMonth(),
      checkInDate.getDate(),
    );

    const checkOutWithoutTime = new Date(
      checkOutDate.getFullYear(),
      checkOutDate.getMonth(),
      checkOutDate.getDate(),
    );

    // Nếu là booking của 1 ngày (check-in và check-out cùng ngày),
    // hãy đặt check-out vào ngày hôm sau để đảm bảo tính toán đúng
    if (checkInWithoutTime.getTime() === checkOutWithoutTime.getTime()) {
      checkOutWithoutTime.setDate(checkOutWithoutTime.getDate() + 1);
    }

    // Log thông tin booking đang cố đặt để debug
    console.log('Checking availability for dates:', {
      checkIn: checkInWithoutTime.toISOString(),
      checkOut: checkOutWithoutTime.toISOString(),
      existingBookings: bookings.length,
    });

    // Filter out bookings that overlap with the requested dates
    const conflictingBookings = bookings.filter((booking) => {
      // Exclude current booking if ID is provided
      if (excludeBookingId && booking.id === excludeBookingId) {
        return false;
      }

      // Chuẩn hóa ngày đặt phòng của booking
      const bookingCheckIn = new Date(booking.checkInDate);
      const bookingCheckInWithoutTime = new Date(
        bookingCheckIn.getFullYear(),
        bookingCheckIn.getMonth(),
        bookingCheckIn.getDate(),
      );

      const bookingCheckOut = new Date(booking.checkOutDate);
      const bookingCheckOutWithoutTime = new Date(
        bookingCheckOut.getFullYear(),
        bookingCheckOut.getMonth(),
        bookingCheckOut.getDate(),
      );

      // Kiểm tra xem có bất kỳ ngày nào trong khoảng đặt phòng mới trùng với đặt phòng hiện có
      // Phòng được coi là đã đặt vào ngày check-in và các ngày ở giữa (không bao gồm ngày check-out)
      const conflicting =
        // Có ít nhất một ngày trong khoảng mới trùng với khoảng hiện có
        checkInWithoutTime < bookingCheckOutWithoutTime &&
        bookingCheckInWithoutTime < checkOutWithoutTime;

      if (conflicting) {
        console.log(
          `Found conflicting booking: ${booking.id}, dates: ${bookingCheckInWithoutTime.toISOString()} - ${bookingCheckOutWithoutTime.toISOString()}`,
        );
      }

      return conflicting;
    });

    return conflictingBookings;
  }

  private async handleStatusChange(
    booking: Booking,
    newStatus: BookingStatus,
    updateDto: UpdateBookingDto,
  ): Promise<void> {
    switch (newStatus) {
      case BookingStatus.CANCELLED:
        if (!updateDto.cancellationReason) {
          throw new BadRequestException(
            'Cancellation reason is required when cancelling a booking',
          );
        }
        await this.roomsService.updateStatus(booking.roomId, 'Available');
        break;

      case BookingStatus.REJECTED:
        if (!updateDto.rejectReason) {
          throw new BadRequestException(
            'Rejection reason is required when rejecting a booking',
          );
        }
        await this.roomsService.updateStatus(booking.roomId, 'Available');
        break;

      case BookingStatus.CHECKED_IN:
        booking.checkInTime = new Date();
        break;

      case BookingStatus.CHECKED_OUT:
        booking.checkOutTime = new Date();
        await this.roomsService.updateStatus(booking.roomId, 'Cleaning');
        break;

      case BookingStatus.CONFIRMED:
        // No special handling needed
        break;

      case BookingStatus.PENDING:
        // Revert to pending (unusual case)
        break;
    }
  }

  // Room availability calendar
  async getRoomAvailabilityCalendar(
    branchId: number,
    startDate: Date,
    endDate: Date,
    floorId?: any,
    roomTypeId?: number,
    forceRefresh: boolean = false,
  ): Promise<any[]> {
    console.log(
      `Room availability calendar request - branchId: ${branchId}, floorId:`,
      floorId,
      `roomTypeId: ${roomTypeId}`,
      `forceRefresh: ${forceRefresh}`,
    );

    // Xử lý floorId một cách an toàn
    let parsedFloorId: number | undefined = undefined;
    if (floorId !== undefined && floorId !== null) {
      // Nếu là số hoặc chuỗi số
      if (typeof floorId === 'number') {
        parsedFloorId = floorId;
      } else if (typeof floorId === 'string' && !isNaN(Number(floorId))) {
        parsedFloorId = Number(floorId);
      }
      // Nếu là đối tượng có thuộc tính floorId
      else if (
        typeof floorId === 'object' &&
        floorId !== null &&
        'floorId' in floorId
      ) {
        const floorIdValue = (floorId as any).floorId;
        if (
          typeof floorIdValue === 'number' ||
          (typeof floorIdValue === 'string' && !isNaN(Number(floorIdValue)))
        ) {
          parsedFloorId = Number(floorIdValue);
        }
      }
    }

    try {
      // Lấy tất cả các phòng phù hợp với tiêu chí
      const rooms = await this.roomsService.findAll(
        undefined, // Không sử dụng tham số floor
        roomTypeId,
        undefined, // Không lọc theo trạng thái
        branchId,
      );

      // Lọc phòng theo tầng nếu có floorId
      const filteredRooms = parsedFloorId
        ? rooms.filter((room) => room.floorId === parsedFloorId)
        : rooms;

      console.log(
        `After floor filtering: ${filteredRooms.length} rooms remain`,
      );

      // Xử lý refresh data - nếu force refresh, đợi 1 giây trước khi tiếp tục
      // để đảm bảo database đã cập nhật
      if (forceRefresh) {
        console.log('Force refresh requested - clearing query cache');
        // Đợi 1 giây để đảm bảo các thay đổi gần đây đã được cập nhật trong DB
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Lấy tất cả đặt phòng trong khoảng thời gian, bao gồm cả bookings giao với startDate và endDate
      const bookings = await this.bookingsRepository.find({
        where: [
          // Bookings bắt đầu trong khoảng thời gian
          {
            branchId,
            checkInDate: Between(startDate, endDate),
            status: In([
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.CHECKED_IN,
            ]),
          },
          // Bookings kết thúc trong khoảng thời gian
          {
            branchId,
            checkOutDate: Between(startDate, endDate),
            status: In([
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.CHECKED_IN,
            ]),
          },
          // Bookings bao phủ toàn bộ khoảng thời gian (bắt đầu trước startDate và kết thúc sau endDate)
          {
            branchId,
            checkInDate: Between(
              new Date(0), // Từ thời điểm bắt đầu
              startDate, // Đến startDate
            ),
            checkOutDate: Between(
              endDate, // Từ endDate
              new Date(8640000000000000), // Đến thời điểm rất xa trong tương lai
            ),
            status: In([
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.CHECKED_IN,
            ]),
          },
        ],
        relations: ['customer'], // Thêm quan hệ để truy cập dữ liệu khách hàng
        // Bỏ cache query để luôn lấy dữ liệu mới nhất khi force refresh
        ...(forceRefresh ? { cache: false } : {}),
      });

      // Xây dựng dữ liệu lịch
      return filteredRooms.map((room) => {
        const roomBookings = bookings.filter(
          (booking) => booking.roomId === room.id,
        );

        return {
          room,
          bookings: roomBookings,
          // Tính khả dụng cho mỗi ngày trong khoảng
          availability: this.calculateDailyAvailability(
            room,
            roomBookings,
            startDate,
            endDate,
          ),
        };
      });
    } catch (error) {
      console.error('Error getting room availability calendar:', error);
      throw new BadRequestException(
        `Failed to get room availability calendar: ${error.message}`,
      );
    }
  }

  private calculateDailyAvailability(
    room: any,
    bookings: Booking[],
    startDate: Date,
    endDate: Date,
  ): DailyAvailability[] {
    const result: DailyAvailability[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    // Kiểm tra và log thông tin phòng
    console.log(
      `Calculate availability for room ${room?.roomCode || 'unknown'}, ID: ${room?.id || 'unknown'}, Status: ${room?.status}`,
    );

    // Chuẩn hóa tất cả các ngày booking để dễ so sánh
    const normalizedBookings = bookings.map((booking) => {
      if (!booking.checkInDate || !booking.checkOutDate) {
        return booking;
      }

      // Chuẩn hóa để chỉ giữ ngày tháng năm, loại bỏ giờ phút giây
      const checkInDate = new Date(booking.checkInDate);
      const normalizedCheckIn = new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate(),
      );

      const checkOutDate = new Date(booking.checkOutDate);
      const normalizedCheckOut = new Date(
        checkOutDate.getFullYear(),
        checkOutDate.getMonth(),
        checkOutDate.getDate(),
      );

      return {
        ...booking,
        normalizedCheckIn,
        normalizedCheckOut,
      };
    });

    // Log toàn bộ bookings đã chuẩn hóa cho phòng này để debug
    if (room?.roomCode === 'P101') {
      console.log(
        `Room ${room.roomCode} has ${normalizedBookings.length} bookings:`,
      );
      normalizedBookings.forEach((booking: any, index) => {
        console.log({
          id: booking.id,
          status: booking.status,
          checkIn: booking.normalizedCheckIn?.toISOString(),
          checkOut: booking.normalizedCheckOut?.toISOString(),
        });
      });
    }

    while (currentDate <= endDate) {
      const date = new Date(currentDate);
      // Chuẩn hóa ngày hiện tại để chỉ giữ ngày tháng năm, loại bỏ giờ phút giây
      const dateWithoutTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const isCurrentDateToday = dateWithoutTime.getTime() === today.getTime();

      // Tìm booking cho ngày này - ưu tiên booking với trạng thái checked-in, confirmed, và pending
      let activeBooking: Booking | null = null;
      let isAvailable = true; // Mặc định là có sẵn

      // QUAN TRỌNG: Kiểm tra xem có booking nào cho ngày này không
      // Tìm booking nào đặt vào chính xác ngày này
      const overlappingBookings = normalizedBookings.filter((booking: any) => {
        if (!booking.normalizedCheckIn || !booking.normalizedCheckOut) {
          return false;
        }

        const bookingStartTime = booking.normalizedCheckIn.getTime();
        const bookingEndTime = booking.normalizedCheckOut.getTime();
        const currentDateTime = dateWithoutTime.getTime();

        // Chỉ xem xét các booking đang active (pending, confirmed, checked-in)
        const isActiveBooking = [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.CHECKED_IN,
        ].includes(booking.status);

        if (!isActiveBooking) {
          return false;
        }

        // Một ngày được coi là đã đặt nếu:
        // 1. Đó chính là ngày check-in, HOẶC
        // 2. Nó nằm giữa ngày check-in và check-out (không bao gồm ngày check-out)
        return (
          currentDateTime === bookingStartTime ||
          (currentDateTime > bookingStartTime &&
            currentDateTime < bookingEndTime)
        );
      });

      // Log thông tin để debug
      if (overlappingBookings.length > 0 && room.roomCode === 'P101') {
        console.log(
          `Date ${dateWithoutTime.toISOString()} has ${overlappingBookings.length} overlapping bookings for Room ${room.roomCode}`,
        );
        overlappingBookings.forEach((b: any, i) => {
          console.log({
            id: b.id,
            status: b.status,
            checkIn: b.normalizedCheckIn?.toISOString(),
            checkOut: b.normalizedCheckOut?.toISOString(),
          });
        });
      }

      if (overlappingBookings.length > 0) {
        // Ưu tiên theo thứ tự: CHECKED_IN > CONFIRMED > PENDING
        const checkedInBooking = overlappingBookings.find(
          (b) => b.status === BookingStatus.CHECKED_IN,
        );
        const confirmedBooking = overlappingBookings.find(
          (b) => b.status === BookingStatus.CONFIRMED,
        );
        const pendingBooking = overlappingBookings.find(
          (b) => b.status === BookingStatus.PENDING,
        );

        // Chọn booking theo thứ tự ưu tiên
        activeBooking =
          checkedInBooking || confirmedBooking || pendingBooking || null;

        // Nếu có booking, phòng không còn sẵn sàng để đặt CHỈ cho ngày đó
        if (activeBooking) {
          isAvailable = false;
        }
      }

      // Kiểm tra trạng thái phòng CHỈ khi đó là ngày hôm nay
      // Các trạng thái phòng chỉ ảnh hưởng đến khả năng đặt phòng của ngày hiện tại
      if (isCurrentDateToday && activeBooking === null) {
        // Nếu không có booking và là ngày hôm nay, kiểm tra trạng thái phòng
        if (room && room.status) {
          const unavailableStatuses = [
            RoomStatus.MAINTENANCE,
            RoomStatus.CLEANING,
          ];

          // CHỈ ảnh hưởng khả năng đặt phòng nếu phòng đang bảo trì hoặc dọn dẹp
          // KHÔNG ảnh hưởng nếu phòng ở trạng thái BOOKED mà không có booking thực tế
          if (unavailableStatuses.includes(room.status as RoomStatus)) {
            if (
              room.status === RoomStatus.MAINTENANCE &&
              room.maintenanceEndDate
            ) {
              // Nếu ngày kết thúc bảo trì đã qua, phòng có thể đặt
              isAvailable = new Date(room.maintenanceEndDate) < date;
            } else if (
              room.status === RoomStatus.CLEANING &&
              room.cleaningEndDate
            ) {
              // Nếu ngày kết thúc dọn dẹp đã qua, phòng có thể đặt
              isAvailable = new Date(room.cleaningEndDate) < date;
            } else {
              // Nếu không có ngày kết thúc, phòng không khả dụng cho ngày hôm nay
              isAvailable = false;
            }
          }
        }
      }

      // Log thông tin ngày và trạng thái cho phòng P101 để debug
      if (room.roomCode === 'P101') {
        console.log(
          `Room ${room.roomCode} - Date ${dateWithoutTime.toISOString()}: ${isAvailable ? 'Available' : 'Not available'}, Has booking: ${activeBooking ? 'Yes' : 'No'}`,
        );
      }

      // Thêm vào kết quả
      result.push({
        date: new Date(date),
        available: isAvailable,
        booking: activeBooking,
      });

      // Chuyển đến ngày tiếp theo
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  // Update payment status for a booking
  async updatePaymentStatus(
    id: string,
    paymentStatus: string,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Validate that paymentStatus is one of the valid values
    const validStatuses = ['unpaid', 'partial', 'paid', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      throw new BadRequestException(
        `Invalid payment status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Update payment status
    booking.paymentStatus = paymentStatus as PaymentStatus;
    return await this.bookingsRepository.save(booking);
  }

  // Send invoice by email
  async sendInvoiceEmail(id: string, email: string) {
    try {
      // First check if the booking exists
      const booking = await this.findOne(id);

      // Then delegate to payments service to send the invoice
      if (
        this.paymentsService &&
        typeof this.paymentsService.sendInvoiceEmail === 'function'
      ) {
        return this.paymentsService.sendInvoiceEmail(id, email);
      } else {
        throw new Error('Payment service not configured for email sending');
      }
    } catch (error) {
      throw new NotFoundException(
        `Could not find booking with ID ${id} or email service is not configured`,
      );
    }
  }
}
