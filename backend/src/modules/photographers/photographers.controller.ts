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

  @Post('me/makeup-cooperations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '摄影师：新增一位固定合作妆造师邀请（可绑定多位；需妆造师确认）',
  })
  addMakeupCooperation(
    @Request() req: { user: { sub: number } },
    @Body() body: { makeupArtistId: number; inviteNote?: string | null },
  ) {
    return this.photographersService.addMakeupCooperationForMine(
      req.user.sub,
      Number(body?.makeupArtistId),
      body?.inviteNote,
    );
  }

  @Delete('me/makeup-cooperations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '摄影师：撤销一条待妆造师确认的邀请' })
  revokeMakeupCooperation(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.photographersService.revokePendingMakeupCooperationForMine(
      req.user.sub,
      id,
    );
  }

  @Get('me/fixed-cooperation/incoming')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '妆造师：待确认的固定合作邀请列表' })
  listIncomingFixedCooperation(@Request() req: { user: { sub: number } }) {
    return this.photographersService.listIncomingFixedCooperationByUserId(
      req.user.sub,
    );
  }

  @Get('me/fixed-cooperation/bound-photographers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '妆造师：已确认将你设为固定合作的摄影师列表',
  })
  listBoundPhotographersForMakeup(@Request() req: { user: { sub: number } }) {
    return this.photographersService.listBoundPhotographersForMakeupByUserId(
      req.user.sub,
    );
  }

  @Post('me/fixed-cooperation/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '妆造师：同意或拒绝摄影师的固定合作申请' })
  respondFixedCooperation(
    @Request() req: { user: { sub: number } },
    @Body()
    body: {
      photographerId?: number;
      cooperationId?: number;
      accept: boolean;
      rejectReason?: string | null;
    },
  ) {
    return this.photographersService.respondFixedCooperationByUserId(
      req.user.sub,
      body?.photographerId == null ? undefined : Number(body.photographerId),
      body?.accept === true,
      body?.rejectReason,
      body?.cooperationId == null ? undefined : Number(body.cooperationId),
    );
  }

  @Post('me/fixed-cooperation/dissolve/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '申请解除已确认的固定合作（需对方确认；传 cooperationId 为合作记录 id）',
  })
  requestFixedCooperationDissolve(
    @Request() req: { user: { sub: number } },
    @Body() body: { reason: string; cooperationId: number },
  ) {
    return this.photographersService.requestFixedCooperationDissolveByUserId(
      req.user.sub,
      String(body?.reason ?? ''),
      Number(body?.cooperationId),
    );
  }

  @Post('me/fixed-cooperation/dissolve/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '回应解除固定合作申请（须传 cooperationId）',
  })
  respondFixedCooperationDissolve(
    @Request() req: { user: { sub: number } },
    @Body()
    body: {
      cooperationId: number;
      accept: boolean;
      rejectReason?: string | null;
    },
  ) {
    return this.photographersService.respondFixedCooperationDissolveByUserId(
      req.user.sub,
      body?.accept === true,
      Number(body?.cooperationId),
      body?.rejectReason,
    );
  }
}
