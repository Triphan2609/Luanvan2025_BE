import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Restaurant Orders')
@Controller('restaurant/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new restaurant order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all restaurant orders' })
  findAll(@Query() query: any) {
    return this.orderService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active restaurant orders' })
  findActive() {
    return this.orderService.findActive();
  }

  @Get('by-table/:tableId')
  @ApiOperation({ summary: 'Get orders by table ID' })
  findByTable(@Param('tableId') tableId: string) {
    const tableIdNumber = parseInt(tableId, 10);
    return this.orderService.findAll({ tableId: tableIdNumber });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a restaurant order by ID' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a restaurant order' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Post(':id/send-to-kitchen')
  @ApiOperation({ summary: 'Send an order to the kitchen' })
  sendToKitchen(@Param('id') id: string) {
    return this.orderService.sendToKitchen(id);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update an order item' })
  updateOrderItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() data: any,
  ) {
    return this.orderService.updateOrderItem(id, itemId, data);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to an order' })
  addItems(@Param('id') id: string, @Body() body: { items: any[] }) {
    // Create UpdateOrderDto with just the items
    const updateDto: UpdateOrderDto = {
      items: body.items,
    };
    return this.orderService.update(id, updateDto);
  }

  @Post(':id/add-more-items')
  @ApiOperation({
    summary: 'Add more items to an existing order and send to kitchen',
  })
  @ApiResponse({
    status: 200,
    description: 'Items added and sent to kitchen successfully',
  })
  async addMoreItems(@Param('id') id: string, @Body() body: { items: any[] }) {
    // First add the items to the order
    const updateDto: UpdateOrderDto = {
      items: body.items,
    };
    await this.orderService.update(id, updateDto);

    // Then send the new items to kitchen
    return this.orderService.sendNewItemsToKitchen(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a restaurant order' })
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
