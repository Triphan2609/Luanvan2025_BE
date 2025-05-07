import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
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
import { In } from 'typeorm';

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

    // Generate unique customer code
    const customerCode = await this.generateUniqueCustomerCode();

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

  async importCustomers(customers: CreateCustomerDto[]): Promise<{
    success: boolean;
    imported: number;
    errors: Array<{ customer: CreateCustomerDto; error: string }>;
  }> {
    const importResults = {
      success: true,
      imported: 0,
      errors: [] as Array<{ customer: CreateCustomerDto; error: string }>,
    };

    // Keep track of phones and ID numbers in current batch to check for duplicates
    const batchPhones = new Set<string>();
    const batchIdNumbers = new Set<string>();

    // Process customers in batches
    for (const customerDto of customers) {
      try {
        // Check for duplicates in current batch
        if (batchPhones.has(customerDto.phone)) {
          throw new ConflictException(
            `A customer with phone ${customerDto.phone} already exists in the import batch`,
          );
        }

        if (customerDto.idNumber && batchIdNumbers.has(customerDto.idNumber)) {
          throw new ConflictException(
            `A customer with ID number ${customerDto.idNumber} already exists in the import batch`,
          );
        }

        // Check for existing customer with the same phone in database
        const existingPhone = await this.customersRepository.findOne({
          where: { phone: customerDto.phone },
        });
        if (existingPhone) {
          throw new ConflictException(
            `A customer with phone ${customerDto.phone} already exists in the database`,
          );
        }

        // Check for existing customer with the same ID number in database
        if (customerDto.idNumber) {
          const existingIdNumber = await this.customersRepository.findOne({
            where: { idNumber: customerDto.idNumber },
          });
          if (existingIdNumber) {
            throw new ConflictException(
              `A customer with ID number ${customerDto.idNumber} already exists in the database`,
            );
          }
        }

        // Generate unique customer code
        const customerCode = await this.generateUniqueCustomerCode(
          importResults.imported,
        );

        // Create new customer
        const customer = this.customersRepository.create({
          ...customerDto,
          customer_code: customerCode,
          status: CustomerStatus.ACTIVE,
          totalBookings: 0,
          totalSpent: 0,
        });

        await this.customersRepository.save(customer);
        importResults.imported += 1;

        // Add to batch tracking
        batchPhones.add(customerDto.phone);
        if (customerDto.idNumber) {
          batchIdNumbers.add(customerDto.idNumber);
        }
      } catch (error) {
        importResults.success = false;
        importResults.errors.push({
          customer: customerDto,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // If no customers were imported and there are errors, throw an exception
    if (importResults.imported === 0 && importResults.errors.length > 0) {
      throw new HttpException(
        {
          message: 'Failed to import any customers',
          errors: importResults.errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // If some customers were imported but there are also errors, return partial success
    if (importResults.imported > 0 && importResults.errors.length > 0) {
      throw new HttpException(
        {
          message: `Imported ${importResults.imported} customers with ${importResults.errors.length} errors`,
          importResults,
        },
        HttpStatus.PARTIAL_CONTENT,
      );
    }

    return importResults;
  }

  // Batch operations
  async batchToggleStatus(
    ids: string[],
    status: CustomerStatus,
  ): Promise<{ success: boolean; affected: number }> {
    try {
      // Validate that all ids exist
      await this.validateCustomerIds(ids);

      const result = await this.customersRepository
        .createQueryBuilder()
        .update(Customer)
        .set({ status })
        .where('id IN (:...ids)', { ids })
        .execute();

      return {
        success: true,
        affected: result.affected || 0,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to update customer statuses',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async batchUpdateType(
    ids: string[],
    type: CustomerType,
  ): Promise<{ success: boolean; affected: number }> {
    try {
      // Validate that all ids exist
      await this.validateCustomerIds(ids);

      const result = await this.customersRepository
        .createQueryBuilder()
        .update(Customer)
        .set({ type })
        .where('id IN (:...ids)', { ids })
        .execute();

      return {
        success: true,
        affected: result.affected || 0,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to update customer types',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async batchDelete(
    ids: string[],
  ): Promise<{ success: boolean; affected: number }> {
    try {
      // Validate that all ids exist
      await this.validateCustomerIds(ids);

      const result = await this.customersRepository
        .createQueryBuilder()
        .delete()
        .from(Customer)
        .where('id IN (:...ids)', { ids })
        .execute();

      return {
        success: true,
        affected: result.affected || 0,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to delete customers',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async batchAssignBranch(
    ids: string[],
    branchId: number,
  ): Promise<{ success: boolean; affected: number }> {
    try {
      // Validate that all ids exist
      await this.validateCustomerIds(ids);

      // TODO: Validate that branch exists
      // This should be checked in a real implementation

      const result = await this.customersRepository
        .createQueryBuilder()
        .update(Customer)
        .set({ branchId })
        .where('id IN (:...ids)', { ids })
        .execute();

      return {
        success: true,
        affected: result.affected || 0,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to assign branch to customers',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper method to validate customer IDs
  private async validateCustomerIds(ids: string[]): Promise<void> {
    if (!ids.length) {
      throw new HttpException(
        {
          message: 'No customer IDs provided',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundCustomers = await this.customersRepository.count({
      where: { id: In(ids) },
    });

    if (foundCustomers !== ids.length) {
      throw new HttpException(
        {
          message: `Some customers not found. Found ${foundCustomers} out of ${ids.length}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper method to generate a unique customer code
  private async generateUniqueCustomerCode(
    offset: number = 0,
  ): Promise<string> {
    let isCodeUnique = false;
    let customerCode = '';
    let attempt = 0;

    while (!isCodeUnique) {
      // Get the base count
      const customerCount =
        (await this.customersRepository.count()) + offset + attempt;
      customerCode = `KH${String(customerCount + 1).padStart(4, '0')}`;

      // Check if code already exists
      const existingCode = await this.customersRepository.findOne({
        where: { customer_code: customerCode },
      });

      if (!existingCode) {
        isCodeUnique = true;
      } else {
        // If code exists, increment attempt counter to try next number
        attempt++;
        // Add safety limit to prevent infinite loop
        if (attempt > 100) {
          throw new ConflictException(
            'Unable to generate a unique customer code after multiple attempts',
          );
        }
      }
    }

    return customerCode;
  }

  // Phương thức tạo khách hàng vãng lai
  async createWalkInCustomer(customerData: {
    name: string;
    phone: string;
    idCard: string;
    branchId: number;
    type: string;
    isWalkIn: boolean;
  }): Promise<Customer> {
    try {
      // Kiểm tra xem có khách hàng với số điện thoại này chưa
      const existingCustomer = await this.customersRepository.findOne({
        where: { phone: customerData.phone },
      });

      // Nếu đã có khách hàng với số điện thoại này, trả về khách hàng đó
      if (existingCustomer) {
        return existingCustomer;
      }

      // Tạo mã khách hàng cho khách vãng lai
      const customerCode = await this.generateUniqueCustomerCode();

      // Tạo khách hàng mới
      const customer = this.customersRepository.create({
        customer_code: customerCode,
        name: customerData.name,
        phone: customerData.phone,
        idNumber: customerData.idCard,
        branchId: customerData.branchId,
        type:
          customerData.type === 'regular'
            ? CustomerType.NORMAL
            : CustomerType.VIP,
        status: CustomerStatus.ACTIVE,
        totalBookings: 0,
        totalSpent: 0,
      });

      return await this.customersRepository.save(customer);
    } catch (error) {
      throw new Error(
        `Error creating walk-in customer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Phương thức tạo đối tượng khách hàng tạm thời không lưu vào database
  createTempCustomer(customerData: {
    name: string;
    phone: string;
    idCard: string;
    branchId: number;
  }): Customer {
    try {
      // Tạo mã khách hàng tạm thời
      const tempCode = `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Tạo đối tượng khách hàng mới nhưng không lưu vào database
      const tempCustomer = {
        id: tempCode,
        customer_code: `TMP${tempCode.substring(0, 6)}`,
        name: customerData.name,
        phone: customerData.phone,
        idNumber: customerData.idCard,
        branchId: customerData.branchId,
        type: CustomerType.NORMAL,
        status: CustomerStatus.ACTIVE,
        totalBookings: 0,
        totalSpent: 0,
      } as Customer;

      // Trả về đối tượng khách hàng nhưng không lưu vào database
      return tempCustomer;
    } catch (error) {
      throw new Error(
        `Error creating temporary customer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
