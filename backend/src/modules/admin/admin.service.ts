import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoomsGateway } from '@/modules/rooms/rooms.gateway';
import { CozeService } from '@/modules/rooms/coze.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsGateway: RoomsGateway,
    private readonly cozeService: CozeService,
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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalRooms,
      liveRooms,
      closedRooms,
      totalUsers,
      todayUsers,
      weekUsers,
      bannedUsers,
      totalVotes,
      todayVotes,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { status: 'LIVE' } }),
      this.prisma.room.count({ where: { status: 'CLOSED' } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.vote.count(),
      this.prisma.vote.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    return {
      // 案件
      totalRooms,
      liveRooms,
      closedRooms,
      waitingRooms: totalRooms - liveRooms - closedRooms,
      // 用户
      totalUsers,
      todayUsers,
      weekUsers,
      bannedUsers,
      // 投票
      totalVotes,
      todayVotes,
    };
  }

  async getTrends(days = 14) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);

    // 并行拉取三类数据的时间戳
    const [rooms, users, votes] = await Promise.all([
      this.prisma.room.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.vote.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
    ]);

    // 初始化每天的 key
    const roomMap = new Map<string, number>();
    const userMap = new Map<string, number>();
    const voteMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      roomMap.set(key, 0);
      userMap.set(key, 0);
      voteMap.set(key, 0);
    }

    rooms.forEach((r) => {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (roomMap.has(key)) roomMap.set(key, roomMap.get(key)! + 1);
    });
    users.forEach((u) => {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (userMap.has(key)) userMap.set(key, userMap.get(key)! + 1);
    });
    votes.forEach((v) => {
      const key = v.createdAt.toISOString().slice(0, 10);
      if (voteMap.has(key)) voteMap.set(key, voteMap.get(key)! + 1);
    });

    const dates = Array.from(roomMap.keys());
    return dates.map((date) => ({
      date,
      rooms: roomMap.get(date) ?? 0,
      users: userMap.get(date) ?? 0,
      votes: voteMap.get(date) ?? 0,
    }));
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
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true } },
      },
    });

    return rooms.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      viewCount: r.viewCount,
      commentCount: r.commentCount,
      voteCount: r._count.votes,
      createdAt: r.createdAt,
      ownerName: r.owner?.name || r.owner?.email || `用户${r.owner?.id}`,
    }));
  }

  // ─── 智能体审核 ──────────────────────────────────────────────

  async getPendingAgents(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const where: any = { isSystem: false, status: 'PENDING' };
    if (params.search?.trim()) {
      where.OR = [
        { name: { contains: params.search.trim() } },
        { description: { contains: params.search.trim() } },
      ];
    }

    const [total, agents] = await Promise.all([
      this.prisma.agent.count({ where }),
      this.prisma.agent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
        },
      }),
    ]);

    // 补查绑定的知识库（Agent 无 Prisma relation，手动批量查）
    const kbIds = agents
      .map((a) => a.knowledgeBaseId)
      .filter(Boolean) as number[];
    const kbMap = new Map<number, any>();
    if (kbIds.length) {
      const kbs = await this.prisma.knowledgeBase.findMany({
        where: { id: { in: kbIds } },
        select: {
          id: true,
          name: true,
          description: true,
          documents: {
            select: { id: true, filename: true, size: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      kbs.forEach((kb) => kbMap.set(kb.id, kb));
    }

    return {
      data: agents.map((a) => ({
        ...a,
        knowledgeBase: a.knowledgeBaseId
          ? (kbMap.get(a.knowledgeBaseId) ?? null)
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async approveAgent(agentId: string) {
    const agent = await this.prisma.agent.update({
      where: { id: agentId },
      data: { status: 'APPROVED', isPublic: true },
      select: { creatorId: true, name: true },
    });

    if (agent.creatorId) {
      await (this.prisma as any).notification
        .create({
          data: {
            userId: agent.creatorId,
            type: 'AGENT_APPROVED',
            fromUserId: agent.creatorId,
            roomId: null,
          },
        })
        .catch(() => {});
    }

    return { success: true };
  }

  async rejectAgent(agentId: string, reason: string) {
    const agent = await this.prisma.agent.update({
      where: { id: agentId },
      data: { status: 'REJECTED' },
      select: { creatorId: true, name: true },
    });

    if (agent.creatorId) {
      await (this.prisma as any).notification
        .create({
          data: {
            userId: agent.creatorId,
            type: 'AGENT_REJECTED',
            fromUserId: agent.creatorId,
            roomId: null,
          },
        })
        .catch(() => {});
    }

    return { success: true, reason };
  }

  // ─── 标签管理 ────────────────────────────────────────────────

  async getAllTagsAdmin() {
    const tags = await this.prisma.tag.findMany({
      orderBy: { weight: 'desc' },
      include: { _count: { select: { rooms: true } } },
    });
    return tags.map((t) => ({ ...t, roomCount: t._count.rooms }));
  }

  async createTag(data: { name: string; color?: string; weight?: number }) {
    return this.prisma.tag.create({
      data: {
        name: data.name,
        color: data.color || '#6366F1',
        weight: data.weight ?? 0,
      },
    });
  }

  async updateTag(
    tagId: number,
    data: { name?: string; color?: string; weight?: number },
  ) {
    return this.prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.weight !== undefined && { weight: data.weight }),
      },
    });
  }

  async deleteTag(tagId: number) {
    await this.prisma.tag.delete({ where: { id: tagId } });
    return { success: true };
  }

  // ─── 公告管理 ────────────────────────────────────────────────

  async getAnnouncements(params: { page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      this.prisma.announcement.count(),
      this.prisma.announcement.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createAnnouncement(
    adminId: number,
    data: { title: string; content: string; expireAt?: string },
  ) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        adminId,
        expireAt: data.expireAt ? new Date(data.expireAt) : null,
      },
    });

    // 给所有活跃用户推送系统通知（异步，不阻塞）
    this.pushAnnouncementNotifications(adminId).catch(() => {});

    return announcement;
  }

  private async pushAnnouncementNotifications(adminId: number) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
      take: 5000,
    });

    const data = users
      .filter((u) => u.id !== adminId)
      .map((u) => ({
        userId: u.id,
        type: 'ANNOUNCEMENT',
        fromUserId: adminId,
        roomId: null,
      }));

    if (data.length) {
      await (this.prisma as any).notification.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  async deleteAnnouncement(id: number) {
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async getLatestAnnouncement() {
    return this.prisma.announcement.findFirst({
      where: {
        OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── 知识库审核 ──────────────────────────────────────────────

  async getKnowledgeBases(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.search?.trim()) {
      where.OR = [
        { name: { contains: params.search.trim() } },
        { description: { contains: params.search.trim() } },
      ];
    }

    const [total, kbs] = await Promise.all([
      this.prisma.knowledgeBase.count({ where }),
      this.prisma.knowledgeBase.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          documents: {
            select: {
              id: true,
              filename: true,
              mimeType: true,
              size: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    // 找出每个知识库绑定的智能体
    const kbIds = kbs.map((k) => k.id);
    const boundAgents = await this.prisma.agent.findMany({
      where: { knowledgeBaseId: { in: kbIds } },
      select: { id: true, name: true, status: true, knowledgeBaseId: true },
    });
    const agentsByKb = new Map<number, typeof boundAgents>();
    for (const a of boundAgents) {
      if (a.knowledgeBaseId == null) continue;
      const list = agentsByKb.get(a.knowledgeBaseId) ?? [];
      list.push(a);
      agentsByKb.set(a.knowledgeBaseId, list);
    }

    return {
      data: kbs.map((k) => ({
        ...k,
        docCount: k._count.documents,
        boundAgents: agentsByKb.get(k.id) ?? [],
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async deleteKnowledgeBaseAdmin(kbId: number) {
    await this.prisma.agent.updateMany({
      where: { knowledgeBaseId: kbId },
      data: { knowledgeBaseId: null },
    });
    await this.prisma.knowledgeBase.delete({ where: { id: kbId } });
    return { success: true };
  }

  async getKnowledgeDocumentContent(docId: number) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: docId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        content: true,
        status: true,
      },
    });
    if (!doc) throw new Error('文档不存在');
    return doc;
  }

  async deleteKnowledgeDocumentAdmin(docId: number) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: docId },
    });
    if (!doc) throw new Error('文档不存在');
    await this.prisma.knowledgeDocument.delete({ where: { id: docId } });
    return { success: true };
  }

  async approveKnowledgeDocument(docId: number) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: docId },
      include: { knowledgeBase: true },
    });
    if (!doc) throw new Error('文档不存在');
    if (doc.status === 'APPROVED')
      return { success: true, message: '已审核通过' };

    // 上传到 Coze
    let cozeDocId: string | null = doc.cozeDocId ?? null;
    if (!cozeDocId && doc.content) {
      try {
        const buffer = Buffer.from(doc.content, 'base64');
        cozeDocId = await this.cozeService.uploadDocument({
          datasetId: doc.knowledgeBase.cozeKbId,
          filename: doc.filename,
          buffer,
          mimeType: doc.mimeType,
        });
      } catch (err: any) {
        console.warn(
          '[AdminService] Coze upload on approve failed:',
          err?.message,
        );
      }
    }

    await this.prisma.knowledgeDocument.update({
      where: { id: docId },
      data: { status: 'APPROVED', cozeDocId: cozeDocId ?? undefined },
    });

    // 通知文档所有者
    const kb = doc.knowledgeBase;
    await (this.prisma as any).notification
      .create({
        data: {
          userId: kb.userId,
          type: 'DOCUMENT_APPROVED',
          fromUserId: kb.userId,
          roomId: null,
        },
      })
      .catch(() => {});

    return { success: true };
  }

  async rejectKnowledgeDocument(docId: number) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: docId },
      include: { knowledgeBase: true },
    });
    if (!doc) throw new Error('文档不存在');

    await this.prisma.knowledgeDocument.update({
      where: { id: docId },
      data: { status: 'REJECTED', cozeDocId: null },
    });

    await (this.prisma as any).notification
      .create({
        data: {
          userId: doc.knowledgeBase.userId,
          type: 'DOCUMENT_REJECTED',
          fromUserId: doc.knowledgeBase.userId,
          roomId: null,
        },
      })
      .catch(() => {});

    return { success: true };
  }
}
