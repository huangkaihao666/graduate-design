import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
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
}
