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
import { FoodCategoryService } from '../services/food-category.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Restaurant Food Categories')
@Controller('restaurant/food-categories')
export class FoodCategoryController {
  constructor(private readonly foodCategoryService: FoodCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new food category' })
  @ApiResponse({
    status: 201,
    description: 'Food category created successfully',
  })
  create(@Body() createFoodCategoryDto: CreateFoodCategoryDto) {
    return this.foodCategoryService.create(createFoodCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all food categories' })
  findAll(@Query() query: any) {
    return this.foodCategoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a food category by id' })
  findOne(@Param('id') id: string) {
    return this.foodCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a food category' })
  update(
    @Param('id') id: string,
    @Body() updateFoodCategoryDto: UpdateFoodCategoryDto,
  ) {
    return this.foodCategoryService.update(id, updateFoodCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a food category' })
  remove(@Param('id') id: string) {
    return this.foodCategoryService.remove(id);
  }

  @Post(':id/upload-image')
  @ApiOperation({ summary: 'Upload image for a food category' })
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
        destination: './uploads/food-categories',
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
      console.log('===== CATEGORY IMAGE UPLOAD REQUEST =====');
      console.log('Upload category file request - ID:', id);

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

      // Sửa đổi URL - sử dụng đường dẫn tương đối
      const imageUrl = `/uploads/food-categories/${file.filename}`;
      console.log('Generated category image URL:', imageUrl);

      // Find and update the category
      console.log('Finding category with ID:', id);
      const categoryBeforeUpdate = await this.foodCategoryService.findOne(id);
      console.log(
        'Category before update:',
        JSON.stringify(categoryBeforeUpdate),
      );

      // Update the image URL
      const updatedCategory = await this.foodCategoryService.updateImage(
        id,
        imageUrl,
      );
      console.log('Updated category result:', JSON.stringify(updatedCategory));
      console.log('===== CATEGORY IMAGE UPLOAD COMPLETE =====');

      return updatedCategory;
    } catch (error) {
      console.error('Error in uploadImage:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
