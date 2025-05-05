import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Customer,
  CustomerStatus,
  CustomerType,
} from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Check for existing customer with the same phone
    const existingPhone = await this.customersRepository.findOne({
      where: { phone: createCustomerDto.phone },
    });
    if (existingPhone) {
      throw new ConflictException(
        'A customer with this phone number already exists',
      );
    }

    // Check for existing customer with the same ID number
    const existingIdNumber = await this.customersRepository.findOne({
      where: { idNumber: createCustomerDto.idNumber },
    });
    if (existingIdNumber) {
      throw new ConflictException(
        'A customer with this ID number already exists',
      );
    }

    // Generate customer code
    const customerCount = await this.customersRepository.count();
    const customerCode = `KH${String(customerCount + 1).padStart(4, '0')}`;

    // Create new customer
    const customer = this.customersRepository.create({
      ...createCustomerDto,
      customer_code: customerCode,
      status: CustomerStatus.ACTIVE,
      totalBookings: 0,
      totalSpent: 0,
    });

    return this.customersRepository.save(customer);
  }

  async findAll(
    filterDto: FilterCustomerDto,
  ): Promise<PaginationResponseDto<Customer>> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      branchId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const queryBuilder =
      this.customersRepository.createQueryBuilder('customer');

    // Apply filters
    if (search) {
      queryBuilder.where(
        '(customer.name ILIKE :search OR customer.phone ILIKE :search OR customer.idNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('customer.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    if (branchId) {
      queryBuilder.andWhere('customer.branchId = :branchId', { branchId });
    }

    // Apply sorting
    const order =
      sortOrder &&
      typeof sortOrder === 'string' &&
      sortOrder.toUpperCase() === 'ASC'
        ? 'ASC'
        : 'DESC';
    queryBuilder.orderBy(`customer.${sortBy}`, order);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [customers, total] = await queryBuilder.getManyAndCount();

    return new PaginationResponseDto<Customer>(customers, total, page, limit);
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByPhone(phone: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { phone },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with phone ${phone} not found`);
    }
    return customer;
  }

  async findByIdNumber(idNumber: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { idNumber },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID number ${idNumber} not found`,
      );
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(id);

    // Check for duplicate phone number
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingPhone = await this.customersRepository.findOne({
        where: { phone: updateCustomerDto.phone },
      });
      if (existingPhone) {
        throw new ConflictException(
          'A customer with this phone number already exists',
        );
      }
    }

    // Check for duplicate ID number
    if (
      updateCustomerDto.idNumber &&
      updateCustomerDto.idNumber !== customer.idNumber
    ) {
      const existingIdNumber = await this.customersRepository.findOne({
        where: { idNumber: updateCustomerDto.idNumber },
      });
      if (existingIdNumber) {
        throw new ConflictException(
          'A customer with this ID number already exists',
        );
      }
    }

    // Update customer
    const updatedCustomer = this.customersRepository.merge(
      customer,
      updateCustomerDto,
    );
    return this.customersRepository.save(updatedCustomer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customersRepository.remove(customer);
  }

  async toggleStatus(id: string): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.status =
      customer.status === CustomerStatus.ACTIVE
        ? CustomerStatus.BLOCKED
        : CustomerStatus.ACTIVE;
    return this.customersRepository.save(customer);
  }

  async updateBookingStats(
    customerId: string,
    amount: number,
  ): Promise<Customer> {
    const customer = await this.findOne(customerId);

    // Update booking statistics
    customer.totalBookings += 1;
    customer.totalSpent = parseFloat(customer.totalSpent.toString()) + amount;
    customer.lastVisit = new Date();

    return this.customersRepository.save(customer);
  }

  async getCustomerStats(): Promise<any> {
    const totalCustomers = await this.customersRepository.count();
    const totalVipCustomers = await this.customersRepository.count({
      where: { type: CustomerType.VIP },
    });
    const totalActiveCustomers = await this.customersRepository.count({
      where: { status: CustomerStatus.ACTIVE },
    });

    return {
      totalCustomers,
      totalVipCustomers,
      totalActiveCustomers,
    };
  }
}
