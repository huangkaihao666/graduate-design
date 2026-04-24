import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CustomAgentsService } from './custom-agents.service';
import { CreateCustomAgentDto } from './dto/create-agent.dto';
import { UpdateCustomAgentDto } from './dto/update-agent.dto';

@ApiTags('custom-agents')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('custom-agents')
export class CustomAgentsController {
  constructor(private readonly service: CustomAgentsService) {}

  // ─── 工作空间 ────────────────────────────────────────────────

  @Get('workspaces')
  @ApiOkResponse({ description: '获取 Coze 工作空间列表' })
  getWorkspaces() {
    return this.service.getWorkspaces();
  }

  // ─── 我的智能体 ──────────────────────────────────────────────

  @Get('mine')
  @ApiOkResponse({ description: '获取我的智能体列表' })
  getMyAgents(@Request() req: any) {
    return this.service.getMyAgents(req.user.id);
  }

  @Post()
  @ApiOkResponse({
    description: '创建自建智能体（同步在 Coze 创建并发布 Bot）',
  })
  createAgent(@Request() req: any, @Body() dto: CreateCustomAgentDto) {
    return this.service.createAgent(req.user.id, dto);
  }

  @Put(':id')
  @ApiOkResponse({ description: '编辑智能体（同步更新 Coze Bot 并重新发布）' })
  updateAgent(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateCustomAgentDto,
  ) {
    return this.service.updateAgent(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: '删除智能体' })
  deleteAgent(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteAgent(id, req.user.id);
  }

  @Post(':id/publish')
  @ApiOkResponse({ description: '申请公开（提交平台审核）' })
  publishAgent(@Param('id') id: string, @Request() req: any) {
    return this.service.publishAgent(id, req.user.id);
  }

  @Post(':id/coze-publish')
  @ApiOkResponse({ description: '手动重新发布到 Coze API 渠道' })
  cozePublishBot(@Param('id') id: string, @Request() req: any) {
    return this.service.cozePublishBot(id, req.user.id);
  }

  // ─── 公开自建智能体列表（AI 图鉴用） ────────────────────────

  @Get('public')
  @ApiOkResponse({ description: '获取公开的用户自建智能体列表' })
  getPublicCustomAgents(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getPublicCustomAgents({
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  // ─── 知识库 ──────────────────────────────────────────────────

  @Get('knowledge-bases')
  @ApiOkResponse({ description: '获取我的知识库列表' })
  getMyKnowledgeBases(@Request() req: any) {
    return this.service.getMyKnowledgeBases(req.user.id);
  }

  @Post('knowledge-bases')
  @ApiOkResponse({ description: '创建知识库（同步在 Coze 创建 Dataset）' })
  createKnowledgeBase(
    @Request() req: any,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('知识库名称不能为空');
    return this.service.createKnowledgeBase(
      req.user.id,
      name.trim(),
      description,
    );
  }

  @Post('knowledge-bases/:kbId/documents')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: '上传文档到知识库（Base64 方式写入 Coze）' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (
          allowed.includes(file.mimetype) ||
          file.originalname.match(/\.(pdf|txt|doc|docx)$/i)
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('仅支持 PDF、TXT、DOC、DOCX 文件'), false);
        }
      },
    }),
  )
  uploadDocument(
    @Param('kbId', ParseIntPipe) kbId: number,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请上传文件');
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.service.uploadDocument(
      kbId,
      req.user.id,
      filename,
      file.buffer,
      file.mimetype,
    );
  }

  @Delete('knowledge-bases/:kbId/documents/:docId')
  @ApiOkResponse({ description: '删除文档' })
  deleteDocument(
    @Param('kbId', ParseIntPipe) kbId: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Request() req: any,
  ) {
    return this.service.deleteDocument(kbId, docId, req.user.id);
  }

  @Get('knowledge-bases/:kbId/coze-documents')
  @ApiOkResponse({ description: '从 Coze 平台同步文档列表' })
  syncDocumentsFromCoze(
    @Param('kbId', ParseIntPipe) kbId: number,
    @Request() req: any,
  ) {
    return this.service.syncDocumentsFromCoze(kbId, req.user.id);
  }

  // ─── 绑定/解绑知识库 ─────────────────────────────────────────

  @Post(':id/bind-kb')
  @ApiOkResponse({
    description: '绑定知识库到智能体（同步更新 Coze Bot 并重新发布）',
  })
  bindKnowledgeBase(
    @Param('id') id: string,
    @Request() req: any,
    @Body('kbId', ParseIntPipe) kbId: number,
  ) {
    return this.service.bindKnowledgeBase(id, kbId, req.user.id);
  }

  @Post(':id/unbind-kb')
  @ApiOkResponse({ description: '解绑知识库' })
  unbindKnowledgeBase(@Param('id') id: string, @Request() req: any) {
    return this.service.unbindKnowledgeBase(id, req.user.id);
  }
}
