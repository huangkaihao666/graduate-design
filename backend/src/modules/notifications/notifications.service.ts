import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前用户的通知列表（最新 30 条）
   */
  async getNotifications(userId: number) {
    const notifications = await (this.prisma as any).notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        fromUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    return notifications;
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
