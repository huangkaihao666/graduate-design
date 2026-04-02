import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '协同滤波推荐（返回推荐套餐与地点）' })
  getRecommendations(@Request() req: { user: { id: number } }) {
    return this.packagesService.recommendForUser(req.user.id, 6);
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
      spotId?: number;
      location?: string;
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
  @ApiOperation({ summary: '更新套餐（可选景点同步城市，或手填目的地）' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      spotId: number | null;
      location: string;
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
