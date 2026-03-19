import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoomsGateway } from '@/modules/rooms/rooms.gateway';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  async getRooms(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search && params.search.trim()) {
      where.OR = [
        { title: { contains: params.search.trim() } },
        { content: { contains: params.search.trim() } },
      ];
    }

    const [total, rooms] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
    ]);

    return {
      data: rooms.map((r) => ({
        ...r,
        agents: JSON.parse(r.agents || '[]'),
        onlineCount: this.roomsGateway.getRoomOnlineCount(r.id),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async updateRoomStatus(roomId: number, status: string) {
    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
    return updated;
  }

  async deleteRoom(roomId: number) {
    await this.prisma.room.delete({ where: { id: roomId } });
    return { success: true };
  }

  async getUsers(params: {
    page?: number;
    pageSize?: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.status) where.isActive = params.status === 'ACTIVE';
    if (params.search && params.search.trim()) {
      where.OR = [
        { email: { contains: params.search.trim() } },
        { name: { contains: params.search.trim() } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async updateUserRole(userId: number, role: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  async updateUserStatus(userId: number, isActive: boolean) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  async getViolations(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    // 简易审核：基于关键词命中（可后续替换成举报/风控表）
    const keywords = [
      '辱骂',
      '傻逼',
      'nmsl',
      '滚',
      '垃圾',
      '操你',
      '妈的',
      'fuck',
    ];
    const search = params.search?.trim();

    const where: any = {
      senderType: 'HUMAN',
      ...(search
        ? { content: { contains: search } }
        : {
            OR: keywords.map((k) => ({ content: { contains: k } })),
          }),
    };

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              isActive: true,
            },
          },
          room: { select: { id: true, title: true, status: true } },
        },
      }),
    ]);

    const data = messages.map((m) => {
      const reason =
        keywords.find((k) =>
          (m.content || '').toLowerCase().includes(k.toLowerCase()),
        ) || '关键词命中';
      return {
        id: m.id,
        room: m.room,
        user: m.sender,
        content: m.content,
        reason,
        createdAt: m.createdAt,
      };
    });

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async deleteMessage(messageId: number) {
    await this.prisma.message.delete({ where: { id: messageId } });
    return { success: true };
  }

  async banUser(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { success: true };
  }

  async getOverview() {
    const [rooms, users, todayUsers, activeUsers] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(new Date().toDateString()) },
        },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);
    return { rooms, users, todayUsers, activeUsers };
  }

  async getTrends(days = 14) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);

    const rooms = await this.prisma.room.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    });

    const map = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    rooms.forEach((r) => {
      const key = r.createdAt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }

  async getHotTopics(limit = 10) {
    const rooms = await this.prisma.room.findMany({
      orderBy: [
        { viewCount: 'desc' },
        { commentCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(Math.max(limit, 1), 50),
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        commentCount: true,
        createdAt: true,
      },
    });
    return rooms;
  }
}
