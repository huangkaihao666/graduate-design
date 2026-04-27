import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('rooms')
  async getRooms(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getRooms({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      status,
      search,
    });
  }

  @Put('rooms/:id/status')
  async updateRoomStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return await this.adminService.updateRoomStatus(Number(id), body.status);
  }

  @Delete('rooms/:id')
  async deleteRoom(@Param('id') id: string) {
    return await this.adminService.deleteRoom(Number(id));
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getUsers({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      role,
      status,
      search,
    });
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return await this.adminService.updateUserRole(Number(id), body.role);
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return await this.adminService.updateUserStatus(
      Number(id),
      !!body.isActive,
    );
  }

  @Get('messages/violations')
  async getViolations(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getViolations({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      search,
    });
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    return await this.adminService.deleteMessage(Number(id));
  }

  @Get('messages/room/:roomId')
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return await this.adminService.getRoomMessages(Number(roomId), {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
      search,
    });
  }

  @Post('messages/:id/warn')
  async warnUser(@Param('id') id: string, @Request() req: any) {
    return await this.adminService.warnUser(Number(id), req.user.id);
  }

  @Put('users/:id/ban')
  async banUser(@Param('id') id: string) {
    return await this.adminService.banUser(Number(id));
  }

  @Get('stats/overview')
  async overview() {
    return await this.adminService.getOverview();
  }

  @Get('stats/trends')
  async trends(@Query('days') days?: string) {
    return await this.adminService.getTrends(days ? Number(days) : 14);
  }

  @Get('stats/hotTopics')
  async hotTopics(@Query('limit') limit?: string) {
    return await this.adminService.getHotTopics(limit ? Number(limit) : 10);
  }

  // ─── 智能体审核 ──────────────────────────────────────────────

  @Get('agents/pending')
  async getPendingAgents(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPendingAgents({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      search,
    });
  }

  @Put('agents/:id/approve')
  async approveAgent(@Param('id') id: string) {
    return this.adminService.approveAgent(id);
  }

  @Put('agents/:id/reject')
  async rejectAgent(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectAgent(id, reason || '不符合平台规范');
  }

  // ─── 标签管理 ────────────────────────────────────────────────

  @Get('tags')
  async getAllTags() {
    return this.adminService.getAllTagsAdmin();
  }

  @Post('tags')
  async createTag(
    @Body() body: { name: string; color?: string; weight?: number },
  ) {
    return this.adminService.createTag(body);
  }

  @Put('tags/:id')
  async updateTag(
    @Param('id') id: string,
    @Body() body: { name?: string; color?: string; weight?: number },
  ) {
    return this.adminService.updateTag(Number(id), body);
  }

  @Delete('tags/:id')
  async deleteTag(@Param('id') id: string) {
    return this.adminService.deleteTag(Number(id));
  }

  // ─── 公告管理 ────────────────────────────────────────────────

  @Get('announcements')
  async getAnnouncements(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getAnnouncements({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
    });
  }

  @Post('announcements')
  async createAnnouncement(
    @Request() req: any,
    @Body() body: { title: string; content: string; expireAt?: string },
  ) {
    return this.adminService.createAnnouncement(req.user.id, body);
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(Number(id));
  }

  // ─── 知识库审核 ──────────────────────────────────────────────

  @Get('knowledge-bases')
  async getKnowledgeBases(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getKnowledgeBases({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      search,
    });
  }

  @Delete('knowledge-bases/:id')
  async deleteKnowledgeBase(@Param('id') id: string) {
    return this.adminService.deleteKnowledgeBaseAdmin(Number(id));
  }

  @Get('knowledge-documents/:id/content')
  async getDocumentContent(@Param('id') id: string) {
    return this.adminService.getKnowledgeDocumentContent(Number(id));
  }

  @Delete('knowledge-documents/:id')
  async deleteKnowledgeDocument(@Param('id') id: string) {
    return this.adminService.deleteKnowledgeDocumentAdmin(Number(id));
  }

  @Put('knowledge-documents/:id/approve')
  async approveDocument(@Param('id') id: string) {
    return this.adminService.approveKnowledgeDocument(Number(id));
  }

  @Put('knowledge-documents/:id/reject')
  async rejectDocument(@Param('id') id: string) {
    return this.adminService.rejectKnowledgeDocument(Number(id));
  }

  // ─── 情绪预警 ───────────────────────────────────────────

  @Get('alerts/stats')
  async getAlertStats() {
    return this.adminService.getAlertStats();
  }

  @Get('alerts')
  async getAlerts(@Query() query: any) {
    return this.adminService.getAlerts(query);
  }

  @Put('alerts/:id/handle')
  async handleAlert(
    @Param('id') id: string,
    @Body() body: { handleNote: string },
  ) {
    return this.adminService.handleAlert(Number(id), body.handleNote || '');
  }
}
