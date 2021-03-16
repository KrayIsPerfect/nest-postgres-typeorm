import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Post,
} from '@nestjs/common';
import CategoriesService from './categories.service';
import JwtAuthenticationGuard from '../../authentication/jwt-authentication.guard';
import { FindOneParams } from '../../utils/findOneParams';
import CreateCategoryDto from './dto/categories.create.dto';
import UpdateCategoryDto from './dto/categories.update.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('categories')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Categories')
export default class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAllCategories() {
    return this.categoriesService.getAllCategories();
  }

  @Get(':id')
  getCategoryById(@Param() { id }: FindOneParams) {
    return this.categoriesService.getCategoryById(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  async createCategory(@Body() category: CreateCategoryDto) {
    return this.categoriesService.createCategory(category);
  }

  @Patch(':id')
  async updateCategory(
    @Param() { id }: FindOneParams,
    @Body() category: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(Number(id), category);
  }

  @Delete(':id')
  async deleteCategory(@Param() { id }: FindOneParams) {
    return this.categoriesService.deleteCategory(Number(id));
  }
}
