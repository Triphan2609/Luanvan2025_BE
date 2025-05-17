import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantOrder, OrderStatus } from './order.entity';
import { OrderItem, OrderItemStatus, OrderItemType } from './order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { IngredientService } from '../services/ingredient.service';
import { ServicesService } from '../../services/services.service';

// Helper function để gộp các item giống nhau
function groupOrderItems(items: OrderItem[]): OrderItem[] {
  if (!items || items.length === 0) return [];
  const grouped = new Map<string, OrderItem>();
  for (const item of items) {
    // Key dựa trên foodId/itemId, type, price, name, status
    const key = [
      item.foodId || '',
      item.itemId || '',
      item.type,
      item.price,
      item.name,
      item.status,
    ].join('|');
    const exist = grouped.get(key);
    if (exist) {
      exist.quantity += item.quantity;
      // Nếu note khác nhau, gộp lại
      if (exist.note !== item.note) {
        exist.note = exist.note
          ? exist.note + ' | ' + (item.note || '')
          : item.note || '';
      }
    } else {
      grouped.set(key, { ...item });
    }
  }
  return Array.from(grouped.values());
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(RestaurantOrder)
    private readonly orderRepository: Repository<RestaurantOrder>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly ingredientService: IngredientService,
    private readonly servicesService: ServicesService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<RestaurantOrder> {
    const { items, ...orderData } = createOrderDto;

    const order = this.orderRepository.create({
      ...orderData,
      status: OrderStatus.NEW,
      orderTime: new Date(),
    });

    await this.orderRepository.save(order);

    // Create and associate order items
    if (items && items.length > 0) {
      const orderItems: Partial<OrderItem>[] = [];
      for (const item of items) {
        console.log('[OrderService][create] Nhận item:', {
          name: item.name,
          status: item.status,
          type: item.type,
          itemId: item.itemId,
          foodId: item.foodId,
        });
        const itemType =
          item.type === OrderItemType.SERVICE || item.type === 'service'
            ? OrderItemType.SERVICE
            : OrderItemType.FOOD;
        if (itemType === OrderItemType.SERVICE && item.itemId) {
          await this.servicesService.useService(
            String(item.itemId),
            item.quantity,
          );
        }
        const orderItemData: Partial<OrderItem> = {
          orderId: order.id,
          status: item.status || OrderItemStatus.NEW,
          type: itemType,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          note: item.note,
          ...(itemType === OrderItemType.FOOD && { foodId: item.foodId }),
          ...(itemType === OrderItemType.SERVICE && {
            itemId: String(item.itemId),
          }),
        };
        orderItems.push(orderItemData);
      }
      const createdOrderItems = this.orderItemRepository.create(orderItems);
      await this.orderItemRepository.save(createdOrderItems);
      order.items = createdOrderItems;
    }

    return order;
  }

  async findAll(params?: {
    status?: OrderStatus;
    tableId?: number | string;
    branchId?: number | string;
  }): Promise<RestaurantOrder[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (params?.status) {
      query.andWhere('order.status = :status', { status: params.status });
    }

    if (params?.tableId) {
      query.andWhere('order.tableId = :tableId', {
        tableId:
          typeof params.tableId === 'string'
            ? parseInt(params.tableId, 10)
            : params.tableId,
      });
    }

    if (params?.branchId) {
      query.andWhere('order.branchId = :branchId', {
        branchId:
          typeof params.branchId === 'string'
            ? parseInt(params.branchId, 10)
            : params.branchId,
      });
    }

    const orders = await query.getMany();
    // Gộp các item giống nhau trong từng order
    for (const order of orders) {
      order.items = groupOrderItems(order.items);
    }
    return orders;
  }

  async findActive(): Promise<RestaurantOrder[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.NEW, OrderStatus.PREPARING],
      })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<RestaurantOrder> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    // Gộp các item giống nhau
    order.items = groupOrderItems(order.items);
    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<RestaurantOrder> {
    const order = await this.findOne(id);

    // Update main order fields
    if (updateOrderDto.status !== undefined) {
      order.status = updateOrderDto.status;
    }

    if (updateOrderDto.priority !== undefined) {
      order.priority = updateOrderDto.priority;
    }

    if (updateOrderDto.note !== undefined) {
      order.note = updateOrderDto.note;
    }

    if (updateOrderDto.completionNote !== undefined) {
      order.completionNote = updateOrderDto.completionNote;
    }

    // Handle items updates if provided
    if (updateOrderDto.items && updateOrderDto.items.length > 0) {
      const currentTime = new Date();

      for (const itemDto of updateOrderDto.items) {
        if (itemDto.id) {
          // Update existing item
          const existingItem = order.items.find(
            (item) => item.id === itemDto.id,
          );
          if (existingItem) {
            if (itemDto.quantity !== undefined)
              existingItem.quantity = itemDto.quantity;
            if (itemDto.note !== undefined) existingItem.note = itemDto.note;
            if (itemDto.status !== undefined)
              existingItem.status =
                typeof itemDto.status === 'string' &&
                Object.values(OrderItemStatus).includes(
                  itemDto.status as OrderItemStatus,
                )
                  ? (itemDto.status as OrderItemStatus)
                  : OrderItemStatus.NEW;
            await this.orderItemRepository.save(existingItem);
          }
        } else {
          // Add new item
          const itemType =
            itemDto.type === OrderItemType.SERVICE || itemDto.type === 'service'
              ? OrderItemType.SERVICE
              : OrderItemType.FOOD;
          if (itemType === OrderItemType.SERVICE && itemDto.itemId) {
            await this.servicesService.useService(
              String(itemDto.itemId),
              itemDto.quantity,
            );
          }
          const orderItemData: Partial<OrderItem> = {
            orderId: order.id,
            status:
              typeof itemDto.status === 'string' &&
              Object.values(OrderItemStatus).includes(
                itemDto.status as OrderItemStatus,
              )
                ? (itemDto.status as OrderItemStatus)
                : OrderItemStatus.NEW,
            type: itemType,
            name: itemDto.name,
            price: itemDto.price,
            quantity: itemDto.quantity,
            note: itemDto.note,
            ...(itemType === OrderItemType.FOOD && { foodId: itemDto.foodId }),
            ...(itemType === OrderItemType.SERVICE && {
              itemId: String(itemDto.itemId),
            }),
            createdAt: currentTime,
          };
          const newItem = this.orderItemRepository.create(orderItemData);
          await this.orderItemRepository.save(newItem);
          order.items.push(newItem);
        }
      }
    }

    return this.orderRepository.save(order);
  }

  async updateOrderItem(
    orderId: string,
    itemId: string,
    data: {
      status?: OrderItemStatus;
      note?: string;
      quantity?: number;
    },
  ): Promise<OrderItem> {
    const order = await this.findOne(orderId);
    const item = order.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(
        `Item with ID ${itemId} not found in order ${orderId}`,
      );
    }

    if (data.status !== undefined) {
      item.status = data.status;
    }

    if (data.note !== undefined) {
      item.note = data.note;
    }

    if (data.quantity !== undefined) {
      item.quantity = data.quantity;
    }

    // Đảm bảo luôn có orderId khi save
    item.orderId = order.id;

    await this.orderItemRepository.save(item);

    // Check if all items are completed to update order status
    if (order.items.every((i) => i.status === OrderItemStatus.COMPLETED)) {
      order.status = OrderStatus.COMPLETED;
      await this.orderRepository.save(order);
    } else if (
      order.items.some((i) => i.status === OrderItemStatus.PREPARING)
    ) {
      order.status = OrderStatus.PREPARING;
      await this.orderRepository.save(order);
    }

    return item;
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }

  async sendToKitchen(id: string): Promise<RestaurantOrder> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.NEW) {
      throw new BadRequestException('Only new orders can be sent to kitchen');
    }

    // Deduct ingredients from inventory
    try {
      for (const item of order.items) {
        await this.ingredientService.deductIngredientsForOrder(
          item.foodId,
          item.quantity,
        );
      }
    } catch (error) {
      console.error('Error deducting ingredients:', error);
      // We might want to continue even if there's an error with ingredients
    }

    // Update order status
    order.status = OrderStatus.PREPARING;

    // Update all NEW items status to PREPARING
    for (const item of order.items) {
      if (item.status === OrderItemStatus.NEW) {
        item.status = OrderItemStatus.PREPARING;
        await this.orderItemRepository.save(item);
      }
    }

    return this.orderRepository.save(order);
  }

  async sendNewItemsToKitchen(id: string): Promise<RestaurantOrder> {
    const order = await this.findOne(id);

    // Deduct ingredients only for new items
    try {
      for (const item of order.items) {
        if (item.status === OrderItemStatus.NEW) {
          await this.ingredientService.deductIngredientsForOrder(
            item.foodId,
            item.quantity,
          );
        }
      }
    } catch (error) {
      console.error('Error deducting ingredients:', error);
      // We might want to continue even if there's an error with ingredients
    }

    // Update order status to PREPARING if not already
    if (order.status !== OrderStatus.PREPARING) {
      order.status = OrderStatus.PREPARING;
    }

    // Update only the NEW items status to PREPARING
    // Also ensure createdAt field is set for identifying newly added items
    const currentTime = new Date();
    for (const item of order.items) {
      if (item.status === OrderItemStatus.NEW) {
        // Make sure createdAt is set to recent time if it's a newly added item
        if (!item.createdAt) {
          item.createdAt = currentTime;
        }
        item.status = OrderItemStatus.PREPARING;
        await this.orderItemRepository.save(item);
      }
    }

    return this.orderRepository.save(order);
  }
}
