import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';
import { Customer } from './entities/customer.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';
import { ImportCustomersDto } from './dto/import-customers.dto';
import { BatchActionDto } from './dto/batch-action.dto';
import { BatchToggleStatusDto } from './dto/batch-toggle-status.dto';
import { BatchUpdateTypeDto } from './dto/batch-update-type.dto';
import { BatchAssignBranchDto } from './dto/batch-assign-branch.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The customer has been successfully created.',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'A customer with the same phone or ID number already exists.',
  })
  create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.create(createCustomerDto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import multiple customers' })
  @ApiBody({ type: ImportCustomersDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The customers have been successfully imported.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.PARTIAL_CONTENT,
    description: 'Some customers were not imported due to validation errors.',
  })
  importCustomers(
    @Body() importCustomersDto: ImportCustomersDto,
  ): Promise<any> {
    return this.customersService.importCustomers(importCustomersDto.customers);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all customers matching the filters.',
    type: PaginationResponseDto,
  })
  findAll(
    @Query() filterDto: FilterCustomerDto,
  ): Promise<PaginationResponseDto<Customer>> {
    return this.customersService.findAll(filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return customer statistics',
  })
  getStats() {
    return this.customersService.getCustomerStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the customer with the specified ID',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  findOne(@Param('id') id: string): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: 'Get a customer by phone number' })
  @ApiParam({ name: 'phone', description: 'Customer phone number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the customer with the specified phone number',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  findByPhone(@Param('phone') phone: string): Promise<Customer> {
    return this.customersService.findByPhone(phone);
  }

  @Get('id-number/:idNumber')
  @ApiOperation({ summary: 'Get a customer by ID number' })
  @ApiParam({ name: 'idNumber', description: 'Customer ID number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the customer with the specified ID number',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  findByIdNumber(@Param('idNumber') idNumber: string): Promise<Customer> {
    return this.customersService.findByIdNumber(idNumber);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The customer has been successfully updated.',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'A customer with the same phone or ID number already exists.',
  })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The customer has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle customer status (active/blocked)' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The customer status has been successfully toggled.',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  toggleStatus(@Param('id') id: string): Promise<Customer> {
    return this.customersService.toggleStatus(id);
  }

  @Patch(':id/update-booking-stats')
  @ApiOperation({ summary: 'Update customer booking statistics' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 1000000 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'The customer booking statistics have been successfully updated.',
    type: Customer,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  updateBookingStats(
    @Param('id') id: string,
    @Body('amount') amount: number,
  ): Promise<Customer> {
    return this.customersService.updateBookingStats(id, amount);
  }

  @Patch('batch/toggle-status')
  @ApiOperation({ summary: 'Toggle status of multiple customers' })
  @ApiBody({ type: BatchToggleStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The customer statuses have been successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  batchToggleStatus(@Body() dto: BatchToggleStatusDto) {
    return this.customersService.batchToggleStatus(dto.ids, dto.status);
  }

  @Patch('batch/update-type')
  @ApiOperation({ summary: 'Update type of multiple customers' })
  @ApiBody({ type: BatchUpdateTypeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The customer types have been successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  batchUpdateType(@Body() dto: BatchUpdateTypeDto) {
    return this.customersService.batchUpdateType(dto.ids, dto.type);
  }

  @Delete('batch')
  @ApiOperation({ summary: 'Delete multiple customers' })
  @ApiBody({ type: BatchActionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The customers have been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  batchDelete(@Body() dto: BatchActionDto) {
    return this.customersService.batchDelete(dto.ids);
  }

  @Patch('batch/assign-branch')
  @ApiOperation({ summary: 'Assign branch to multiple customers' })
  @ApiBody({ type: BatchAssignBranchDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The branch has been successfully assigned to the customers.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  batchAssignBranch(@Body() dto: BatchAssignBranchDto) {
    return this.customersService.batchAssignBranch(dto.ids, dto.branchId);
  }
}
