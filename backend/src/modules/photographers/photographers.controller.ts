import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import type { AvatarUploadFile } from '../users/users.service';
import { PhotographersService } from './photographers.service';

@ApiTags('Photographers')
@Controller('photographers')
export class PhotographersController {
  constructor(private readonly photographersService: PhotographersService) {}

  @Post('upload/image')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传图片（管理员），返回 data URL，用于头像/作品' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadImage(@UploadedFile() file: AvatarUploadFile | undefined) {
    return this.photographersService.buildDataUrlFromImage(file);
  }

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
      gender?: string;
      age?: number;
      specialtyTopics?: string;
      awards?: string;
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
      gender: string | null;
      age: number | null;
      specialtyTopics: string | null;
      awards: string | null;
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
