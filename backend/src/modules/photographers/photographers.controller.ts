import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LocalAdminBearerGuard } from '../auth/local-admin-bearer.guard';
import type { AvatarUploadFile } from '../users/users.service';
import { PhotographersService } from './photographers.service';

@ApiTags('Photographers')
@Controller('photographers')
export class PhotographersController {
  constructor(private readonly photographersService: PhotographersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前登录摄影师的档案（工作人员 JWT）' })
  findMine(@Request() req: { user: { sub: number } }) {
    return this.photographersService.findMineByUserId(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '摄影师自助修改档案' })
  patchMine(
    @Request() req: { user: { sub: number } },
    @Body()
    body: Partial<{
      name: string;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      gender: string | null;
      age: number | null;
      specialtyTopics: string | null;
      awards: string | null;
      portfolioImages: string[];
      portfolioItems: Array<{
        url: string;
        category?: 'wedding' | 'makeup' | 'styling';
        desc?: string;
      }>;
      availableDates: string[];
      restDates: string[];
      scheduleNote: string | null;
    }>,
  ) {
    return this.photographersService.updateMineByUserId(req.user.sub, body);
  }

  @Post('me/submit-approval')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交管理员审核（draft / rejected → pending）' })
  submitApproval(@Request() req: { user: { sub: number } }) {
    return this.photographersService.submitForApprovalByUserId(req.user.sub);
  }

  @Post('upload/image')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传图片，返回 data URL' })
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

  @Get('public-makeup')
  @ApiOperation({ summary: '妆造师列表（用户端，可筛选）' })
  findPublicMakeup(
    @Query('style') style?: string,
    @Query('specialty') specialty?: string,
    @Query('minRating') minRating?: string,
  ) {
    return this.photographersService.findPublicMakeupArtists({
      style,
      specialty,
      minRating: Number(minRating || 0),
    });
  }

  @Get('public/:id')
  @ApiOperation({ summary: '摄影师详情（用户端）' })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.photographersService.findOnePublic(id);
  }

  @Get()
  @UseGuards(LocalAdminBearerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '摄影师列表（仅管理员演示 Token）' })
  findAllAdmin() {
    return this.photographersService.findAllAdmin();
  }

  @Patch(':id/approval')
  @UseGuards(LocalAdminBearerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核通过 / 驳回' })
  setApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approved: boolean; reviewNote?: string | null },
  ) {
    return this.photographersService.setAdminApproval(
      id,
      !!body?.approved,
      body?.reviewNote,
    );
  }

  @Patch(':id/enabled')
  @UseGuards(LocalAdminBearerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用 / 禁用前台展示' })
  setEnabled(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { enabled: boolean },
  ) {
    return this.photographersService.setAdminEnabled(id, !!body?.enabled);
  }

  @Patch(':id/title')
  @UseGuards(LocalAdminBearerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置摄影师头衔（仅管理员）' })
  setTitle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string | null },
  ) {
    return this.photographersService.setAdminTitle(id, body?.title ?? null);
  }

  @Delete(':id')
  @UseGuards(LocalAdminBearerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除摄影师/妆造师档案（仅管理员）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.photographersService.removeAdmin(id);
  }

  @Patch('me/fixed-makeup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '摄影师设置固定合作妆造师（为空则解绑）' })
  setFixedMakeup(
    @Request() req: { user: { sub: number } },
    @Body() body: { makeupArtistId?: number | null },
  ) {
    return this.photographersService.setFixedMakeupArtistForMine(
      req.user.sub,
      body?.makeupArtistId == null ? null : Number(body.makeupArtistId),
    );
  }
}
