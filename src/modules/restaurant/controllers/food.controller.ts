import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FoodService } from '../services/food.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Restaurant Foods')
@Controller('restaurant/foods')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new food item' })
  @ApiResponse({ status: 201, description: 'Food item created successfully' })
  create(@Body() createFoodDto: CreateFoodDto) {
    console.log(
      'Creating food with DTO:',
      JSON.stringify(createFoodDto, null, 2),
    );
    console.log('DTO types:', {
      categoryId: typeof createFoodDto.categoryId,
      branchId: typeof createFoodDto.branchId,
    });
    return this.foodService.create(createFoodDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all food items' })
  findAll(@Query() query: any) {
    return this.foodService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a food item by id' })
  findOne(@Param('id') id: string) {
    return this.foodService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a food item' })
  update(@Param('id') id: string, @Body() updateFoodDto: UpdateFoodDto) {
    return this.foodService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a food item' })
  remove(@Param('id') id: string) {
    return this.foodService.remove(id);
  }

  @Post(':id/upload-image')
  @ApiOperation({ summary: 'Upload image for a food item' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/foods',
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên để tránh trùng lặp
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Kiểm tra định dạng file
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // Giới hạn kích thước file 2MB
      },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      console.log('===== FOOD IMAGE UPLOAD REQUEST =====');
      console.log('Upload food image request - ID:', id);

      // Check if request contains a file
      if (!file) {
        console.error('No file received in request');
        throw new Error('No file received');
      }

      // Log file details
      console.log('File details:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        destination: file.destination,
        filename: file.filename,
        path: file.path,
        size: file.size,
      });

      // Create relative URL path
      const imageUrl = `/uploads/foods/${file.filename}`;
      console.log('Generated food image URL:', imageUrl);

      // Find and update the food item
      console.log('Finding food with ID:', id);
      const foodBeforeUpdate = await this.foodService.findOne(id);
      console.log('Food before update:', JSON.stringify(foodBeforeUpdate));

      // Update the image URL
      const updatedFood = await this.foodService.updateImage(id, imageUrl);
      console.log('Updated food result:', JSON.stringify(updatedFood));
      console.log('===== FOOD IMAGE UPLOAD COMPLETE =====');

      return updatedFood;
    } catch (error) {
      console.error('Error in uploadImage:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
