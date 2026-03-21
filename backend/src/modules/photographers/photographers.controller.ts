import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import { PhotographersService } from './photographers.service';

@ApiTags('Photographers')
@Controller('photographers')
export class PhotographersController {
  constructor(private readonly photographersService: PhotographersService) {}

  @Get('public')
  @ApiOperation({ summary: '摄影师列表（用户端，无需登录）' })
  findPublic() {
    return this.photographersService.findPublic();
  }

  @Get('public/:id')
  @ApiOperation({ summary: '摄影师详情（用户端）' })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.photographersService.findOnePublic(id);
  }

  @Get()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '摄影师列表（管理员）' })
  findAllAdmin() {
    return this.photographersService.findAllAdmin();
  }

  @Post()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增摄影师' })
  create(
    @Body()
    body: {
      name: string;
      title?: string;
      avatar?: string;
      shootingStyle: string;
      yearsExperience?: number;
      bio?: string;
      portfolioImages?: string[];
      sortOrder?: number;
      enabled?: boolean;
    },
  ) {
    return this.photographersService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新摄影师' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      name: string;
      title: string | null;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      portfolioImages: string[];
      sortOrder: number;
      enabled: boolean;
    }>,
  ) {
    return this.photographersService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除摄影师' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.photographersService.remove(id);
  }
}
