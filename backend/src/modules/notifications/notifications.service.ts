import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前用户的通知列表（支持按 type 过滤 + 分页）
   */
  async getNotifications(
    userId: number,
    params: { type?: string; page?: number; pageSize?: number } = {},
  ) {
    const { type, page = 1, pageSize = 30 } = params;
    const where: any = { userId };

    if (type && type !== 'ALL') {
      // 支持逗号分隔的多类型，如 "LIKE_COMMENT,NEW_COMMENT,NEW_REPLY"
      const types = type
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      where.type = types.length === 1 ? types[0] : { in: types };
    }

    const skip = (page - 1) * pageSize;
    const [total, notifications] = await Promise.all([
      (this.prisma as any).notification.count({ where }),
      (this.prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          fromUser: { select: { id: true, name: true, avatar: true } },
          room: { select: { id: true, title: true } },
        },
      }),
    ]);

    return { data: notifications, total, page, pageSize };
  }

  /**
   * 获取未读通知数
   */
  async getUnreadCount(userId: number): Promise<number> {
    return (this.prisma as any).notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 标记单条通知为已读
   */
  async markRead(notificationId: number, userId: number) {
    await (this.prisma as any).notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  /**
   * 全部标记为已读
   */
  async markAllRead(userId: number) {
    await (this.prisma as any).notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
