import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Patch,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Service Type endpoints
  @Post('types')
  createServiceType(@Body() createServiceTypeDto: CreateServiceTypeDto) {
    return this.servicesService.createServiceType(createServiceTypeDto);
  }

  @Get('types')
  findAllServiceTypes(@Query('branchId') branchId?: number) {
    return this.servicesService.findAllServiceTypes(branchId);
  }

  @Get('types/:id')
  findServiceTypeById(@Param('id') id: string) {
    return this.servicesService.findServiceTypeById(id);
  }

  @Patch('types/:id')
  updateServiceType(
    @Param('id') id: string,
    @Body() updateServiceTypeDto: Partial<CreateServiceTypeDto>,
  ) {
    return this.servicesService.updateServiceType(id, updateServiceTypeDto);
  }

  @Delete('types/:id')
  removeServiceType(@Param('id') id: string) {
    return this.servicesService.deleteServiceType(id);
  }

  // Service endpoints
  @Post()
  createService(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.createService(createServiceDto);
  }

  @Get()
  findAllServices(
    @Query('branchId') branchId?: number,
    @Query('serviceTypeId') serviceTypeId?: string,
  ) {
    return this.servicesService.findAllServices(branchId, serviceTypeId);
  }

  @Get(':id')
  findServiceById(@Param('id') id: string) {
    return this.servicesService.findServiceById(id);
  }

  @Patch(':id')
  updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: Partial<CreateServiceDto>,
  ) {
    return this.servicesService.updateService(id, updateServiceDto);
  }

  @Delete(':id')
  removeService(@Param('id') id: string) {
    return this.servicesService.deleteService(id);
  }
}
