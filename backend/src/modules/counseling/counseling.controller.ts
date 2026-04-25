import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { CounselingService } from './counseling.service';
import { JwtGuard } from '@/common/guards/jwt.guard';

@ApiTags('counseling')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('counseling')
export class CounselingController {
  constructor(private readonly counselingService: CounselingService) {}

  @Get('available-agents')
  @ApiOkResponse({
    description: '获取可用辅导师列表（系统默认 + 用户自建已审核）',
  })
  getAvailableAgents(@Request() req: any) {
    return this.counselingService.getAvailableAgents(req.user.id);
  }

  @Get('sessions')
  @ApiOkResponse({ description: '获取会话列表' })
  getSessions(@Request() req: any) {
    return this.counselingService.getSessions(req.user.id);
  }

  @Post('sessions')
  @ApiOkResponse({ description: '创建新会话' })
  createSession(
    @Request() req: any,
    @Body()
    body: {
      roomId?: number;
      roomTitle?: string;
      sentimentRecordId?: number;
      counselorBotId?: string | null;
    },
  ) {
    return this.counselingService.createSession(req.user.id, body);
  }

  @Get('sessions/:id/messages')
  @ApiOkResponse({ description: '获取会话消息' })
  getMessages(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.counselingService.getMessages(id, req.user.id);
  }

  @Post('sessions/:id/messages')
  @ApiOkResponse({ description: '发送消息（SSE 流式）' })
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    await this.counselingService.sendMessage(id, req.user.id, content, res);
  }

  @Post('sessions/:id/prefetch')
  @ApiOkResponse({ description: '预检索历史记忆（用户打字时调用）' })
  prefetchMemories(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    return this.counselingService.prefetchMemories(
      id,
      req.user.id,
      content ?? '',
    );
  }

  @Post('sessions/:id/close')
  @ApiOkResponse({ description: '关闭会话' })
  closeSession(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.counselingService.closeSession(id, req.user.id);
  }

  @Delete('sessions/:id')
  @ApiOkResponse({ description: '删除会话' })
  deleteSession(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.counselingService.deleteSession(id, req.user.id);
  }
}
