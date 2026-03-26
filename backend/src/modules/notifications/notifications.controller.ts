import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 获取通知列表
   */
  @Get()
  @ApiOkResponse({ description: '获取通知列表' })
  async getNotifications(@Request() req: any) {
    return await this.notificationsService.getNotifications(req.user.id);
  }

  /**
   * 获取未读通知数
   */
  @Get('unread-count')
  @ApiOkResponse({ description: '未读通知数' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  /**
   * 全部标记已读
   */
  @Patch('read-all')
  @ApiOkResponse({ description: '全部已读' })
  async markAllRead(@Request() req: any) {
    return await this.notificationsService.markAllRead(req.user.id);
  }

  /**
   * 标记单条已读
   */
  @Patch(':id/read')
  @ApiOkResponse({ description: '标记已读' })
  async markRead(@Param('id') id: string, @Request() req: any) {
    return await this.notificationsService.markRead(
      parseInt(id, 10),
      req.user.id,
    );
  }
}
