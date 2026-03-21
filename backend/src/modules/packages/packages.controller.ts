import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import { PackagesService } from './packages.service';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get('admin/all')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '全部套餐（管理员，含草稿/下架）' })
  findAllAdmin() {
    return this.packagesService.findAllAdmin();
  }

  @Get()
  @ApiOperation({ summary: '已上架套餐列表（用户端）' })
  findPublished() {
    return this.packagesService.findPublishedList();
  }

  @Get(':id')
  @ApiOperation({ summary: '套餐详情（用户端，仅已上架）' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOnePublic(id);
  }

  @Post()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增套餐' })
  create(
    @Body()
    body: {
      spotId: number;
      name: string;
      style: string;
      price: number;
      description?: string;
      duration?: number;
      coverImage?: string;
      images?: string[];
      features?: string[];
      includes?: string[];
      excludes?: string[];
      maxPeople?: number;
      originalPrice?: number | null;
      isPopular?: boolean;
      isHot?: boolean;
      status?: string;
    },
  ) {
    return this.packagesService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新套餐（目的地通过 spotId 与景点表一致）' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      spotId: number;
      name: string;
      style: string;
      price: number;
      description: string;
      duration: number;
      coverImage: string;
      images: string[];
      features: string[];
      includes: string[];
      excludes: string[];
      maxPeople: number;
      originalPrice: number | null;
      isPopular: boolean;
      isHot: boolean;
      status: string;
    }>,
  ) {
    return this.packagesService.update(id, body);
  }

  @Patch(':id/status')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '上架/下架切换' })
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.toggleStatus(id);
  }
}
