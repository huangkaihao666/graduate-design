import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { DebateService } from './debate.service';
import { AchievementsService } from '@/modules/achievements/achievements.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debateService: DebateService,
    @Optional() private readonly achievementsService?: AchievementsService,
  ) {}

  /**
   * 创建案件
   */
  async createRoom(data: CreateRoomDto, userId: number) {
    try {
      // 验证 agents 数组
      if (!Array.isArray(data.agents) || data.agents.length !== 3) {
        throw new BadRequestException('必须选择 3 个 AI Agent');
      }

      const room = await this.prisma.room.create({
        data: {
          title: data.title,
          content: data.content,
          image: data.image || null,
          agents: JSON.stringify(data.agents),
          ownerId: userId,
          status: 'WAITING',
          ...(data.tagIds?.length
            ? {
                tags: {
                  create: data.tagIds.map((tagId) => ({ tagId })),
                },
              }
            : {}),
        },
        include: {
          owner: {
            select: { id: true, email: true, name: true, avatar: true },
          },
          tags: { include: { tag: true } },
        },
      });

      this.notifyFollowers(userId, room.id).catch(() => {});
      this.achievementsService?.checkRoomAchievements(userId).catch(() => {});

      return {
        ...room,
        agents: JSON.parse(room.agents),
        tags: room.tags.map((rt) => rt.tag),
      };
    } catch (error) {
      console.error('创建案件错误:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `创建案件失败: ${error.message || '未知错误'}`,
      );
    }
  }

  /**
   * 获取案件列表
   */
  async getRooms(query: QueryRoomDto, userId?: number) {
    const { page = 1, pageSize = 10, status, search, sort, tagId } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (tagId) {
      where.tags = { some: { tagId } };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'hot') {
      orderBy = { viewCount: 'desc' };
    } else if (sort === 'mine') {
      if (!userId) {
        return {
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        };
      }
      where.ownerId = userId;
    }

    const total = await this.prisma.room.count({ where });

    const rooms = await this.prisma.room.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        owner: {
          select: { id: true, email: true, name: true, avatar: true },
        },
        tags: { include: { tag: true } },
      },
    });

    // 批量查询当前用户的点赞/收藏状态
    let likedSet = new Set<number>();
    let favoritedSet = new Set<number>();
    if (userId && rooms.length > 0) {
      const roomIds = rooms.map((r) => r.id);
      const relations = await (this.prisma as any).userRelation.findMany({
        where: {
          userId,
          targetId: { in: roomIds },
          type: { in: ['LIKE_ROOM', 'FAVORITE_ROOM'] },
        },
        select: { targetId: true, type: true },
      });
      for (const rel of relations) {
        if (rel.type === 'LIKE_ROOM') likedSet.add(rel.targetId);
        if (rel.type === 'FAVORITE_ROOM') favoritedSet.add(rel.targetId);
      }
    }

    const formattedRooms = rooms.map((room) => ({
      ...room,
      agents: JSON.parse(room.agents),
      tags: room.tags.map((rt) => rt.tag),
      liked: likedSet.has(room.id),
      favorited: favoritedSet.has(room.id),
    }));

    return {
      data: formattedRooms,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取案件详情
   */
  async getRoomById(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, email: true, name: true, avatar: true },
        },
        votes: {
          select: { agentId: true, id: true },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!room) {
      throw new NotFoundException('案件不存在');
    }

    // 增加浏览数，并返回更新后的值
    const updatedRoom = await this.prisma.room.update({
      where: { id: roomId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true, commentCount: true },
    });

    // 计算投票统计
    const voteStats = await this.prisma.vote.groupBy({
      by: ['agentId'],
      where: { roomId },
      _count: {
        id: true,
      },
    });

    const votes = voteStats.reduce(
      (acc, stat) => {
        acc[stat.agentId] = stat._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...room,
      viewCount: updatedRoom.viewCount,
      commentCount: updatedRoom.commentCount,
      agents: JSON.parse(room.agents),
      tags: room.tags.map((rt) => rt.tag),
      votes,
    };
  }

  /**
   * 更新案件
   */
  async updateRoom(
    roomId: number,
    data: Partial<CreateRoomDto>,
    userId: number,
  ) {
    // 检查权限
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('案件不存在');
    }

    if (room.ownerId !== userId) {
      throw new ForbiddenException('只有案件创建者才能修改案件');
    }

    try {
      const updatedRoom = await this.prisma.room.update({
        where: { id: roomId },
        data: {
          title: data.title,
          content: data.content,
          image: data.image,
          agents: data.agents ? JSON.stringify(data.agents) : undefined,
        },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      return {
        ...updatedRoom,
        agents: JSON.parse(updatedRoom.agents),
      };
    } catch (error) {
      throw new BadRequestException('更新案件失败');
    }
  }

  /**
   * 删除案件
   */
  async deleteRoom(roomId: number, userId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('案件不存在');
    }

    if (room.ownerId !== userId) {
      throw new ForbiddenException('只有案件创建者才能删除案件');
    }

    await this.prisma.room.delete({
      where: { id: roomId },
    });

    return { message: '案件删除成功' };
  }

  /**
   * 添加评论或回复（存入 Message 表 senderType=HUMAN）
   * parentId 有值时为回复某条评论，否则为顶层评论
   */
  async addComment(
    roomId: number,
    userId: number,
    content: string,
    parentId?: number,
  ) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('案件不存在');
    }

    // 若有 parentId，验证父评论存在且属于该房间
    if (parentId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.roomId !== roomId) {
        throw new NotFoundException('被回复的评论不存在');
      }
    }

    const msg = await (this.prisma.message as any).create({
      data: {
        roomId,
        senderId: userId,
        senderType: 'HUMAN',
        content,
        parentId: parentId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // 只有顶层评论才 +1 commentCount；回复不计入
    if (!parentId) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { commentCount: { increment: 1 } },
      });
      // 通知案件 owner（自己评论自己的不通知）
      if (room.ownerId !== userId) {
        await (this.prisma as any).notification
          .create({
            data: {
              userId: room.ownerId,
              type: 'NEW_COMMENT',
              fromUserId: userId,
              roomId,
              messageId: msg.id,
            },
          })
          .catch(() => null);
      }
    } else {
      // 回复：通知被回复评论的作者（自己回复自己的不通知）
      const parentMsg = await this.prisma.message.findUnique({
        where: { id: parentId },
      });
      if (parentMsg?.senderId && parentMsg.senderId !== userId) {
        await (this.prisma as any).notification
          .create({
            data: {
              userId: parentMsg.senderId,
              type: 'NEW_REPLY',
              fromUserId: userId,
              roomId,
              messageId: msg.id,
            },
          })
          .catch(() => null);
      }
    }

    return msg;
  }

  /**
   * 获取顶层评论列表（parentId=null），每条带所有回复（replies）+ 点赞数 + 是否已赞
   */
  async getComments(
    roomId: number,
    page: number = 1,
    pageSize: number = 20,
    currentUserId?: number,
  ) {
    const skip = (page - 1) * pageSize;

    const senderSelect = { id: true, name: true, avatar: true };
    const where = {
      roomId,
      senderType: 'HUMAN',
      senderId: { not: null },
      parentId: null,
    } as any;

    const [comments, total] = await Promise.all([
      (this.prisma.message as any).findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: senderSelect },
          replies: {
            where: { senderType: 'HUMAN' },
            orderBy: { createdAt: 'asc' },
            include: {
              sender: { select: senderSelect },
            },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    // 批量查询点赞数和当前用户点赞状态
    const allIds: number[] = [];
    for (const c of comments) {
      allIds.push(c.id);
      for (const r of c.replies || []) allIds.push(r.id);
    }

    const [likeCounts, userLikes] = await Promise.all([
      allIds.length
        ? (this.prisma as any).messageLike.groupBy({
            by: ['messageId'],
            where: { messageId: { in: allIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      allIds.length && currentUserId
        ? (this.prisma as any).messageLike.findMany({
            where: { messageId: { in: allIds }, userId: currentUserId },
            select: { messageId: true },
          })
        : Promise.resolve([]),
    ]);

    const likeMap: Record<number, number> = {};
    for (const row of likeCounts as any[]) {
      likeMap[row.messageId] = row._count.id;
    }
    const likedSet = new Set<number>(
      (userLikes as any[]).map((l: any) => l.messageId),
    );

    const attach = (msg: any) => ({
      ...msg,
      likeCount: likeMap[msg.id] || 0,
      liked: likedSet.has(msg.id),
    });

    return {
      data: comments.map((c: any) => ({
        ...attach(c),
        replies: (c.replies || []).map(attach),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 点赞评论（幂等）
   */
  async likeComment(messageId: number, userId: number) {
    await (this.prisma as any).messageLike.upsert({
      where: { userId_messageId: { userId, messageId } },
      update: {},
      create: { userId, messageId },
    });
    const count = await (this.prisma as any).messageLike.count({
      where: { messageId },
    });

    // 通知评论作者（自己点自己不通知）
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (msg?.senderId && msg.senderId !== userId) {
      // 同一评论同一用户只需一条通知（幂等）
      const exists = await (this.prisma as any).notification.findFirst({
        where: {
          userId: msg.senderId,
          type: 'LIKE_COMMENT',
          fromUserId: userId,
          messageId,
        },
      });
      if (!exists) {
        await (this.prisma as any).notification
          .create({
            data: {
              userId: msg.senderId,
              type: 'LIKE_COMMENT',
              fromUserId: userId,
              roomId: msg.roomId,
              messageId,
            },
          })
          .catch(() => null);
      }
    }

    return { liked: true, likeCount: count };
  }

  /**
   * 取消点赞
   */
  async unlikeComment(messageId: number, userId: number) {
    await (this.prisma as any).messageLike
      .delete({
        where: { userId_messageId: { userId, messageId } },
      })
      .catch(() => null); // 未点过赞时静默忽略
    const count = await (this.prisma as any).messageLike.count({
      where: { messageId },
    });
    return { liked: false, likeCount: count };
  }

  /**
   * 点赞案件（幂等）
   */
  async likeRoom(roomId: number, userId: number) {
    await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const existing = await (this.prisma as any).userRelation.findUnique({
      where: {
        userId_targetId_type: { userId, targetId: roomId, type: 'LIKE_ROOM' },
      },
    });
    if (existing)
      return { liked: true, likeCount: await this.getRoomLikeCount(roomId) };

    await (this.prisma as any).userRelation.create({
      data: { userId, targetId: roomId, type: 'LIKE_ROOM' },
    });
    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true, ownerId: true },
    });
    // 通知案件作者（不通知自己点赞自己）
    if (updated.ownerId !== userId) {
      await (this.prisma as any).notification
        .create({
          data: {
            userId: updated.ownerId,
            type: 'LIKE_ROOM',
            fromUserId: userId,
            roomId,
          },
        })
        .catch(() => {});
    }
    return { liked: true, likeCount: updated.likeCount };
  }

  /**
   * 取消点赞案件
   */
  async unlikeRoom(roomId: number, userId: number) {
    const deleted = await (this.prisma as any).userRelation
      .delete({
        where: {
          userId_targetId_type: { userId, targetId: roomId, type: 'LIKE_ROOM' },
        },
      })
      .catch(() => null);
    if (deleted) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { likeCount: { decrement: 1 } },
      });
    }
    return { liked: false, likeCount: await this.getRoomLikeCount(roomId) };
  }

  /**
   * 收藏案件（幂等）
   */
  async favoriteRoom(roomId: number, userId: number) {
    await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const existing = await (this.prisma as any).userRelation.findUnique({
      where: {
        userId_targetId_type: {
          userId,
          targetId: roomId,
          type: 'FAVORITE_ROOM',
        },
      },
    });
    if (existing)
      return {
        favorited: true,
        favoriteCount: await this.getRoomFavoriteCount(roomId),
      };

    await (this.prisma as any).userRelation.create({
      data: { userId, targetId: roomId, type: 'FAVORITE_ROOM' },
    });
    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { favoriteCount: { increment: 1 } },
      select: { favoriteCount: true, ownerId: true },
    });
    if (updated.ownerId !== userId) {
      await (this.prisma as any).notification
        .create({
          data: {
            userId: updated.ownerId,
            type: 'FAVORITE_ROOM',
            fromUserId: userId,
            roomId,
          },
        })
        .catch(() => {});
    }
    return { favorited: true, favoriteCount: updated.favoriteCount };
  }

  /**
   * 取消收藏案件
   */
  async unfavoriteRoom(roomId: number, userId: number) {
    const deleted = await (this.prisma as any).userRelation
      .delete({
        where: {
          userId_targetId_type: {
            userId,
            targetId: roomId,
            type: 'FAVORITE_ROOM',
          },
        },
      })
      .catch(() => null);
    if (deleted) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { favoriteCount: { decrement: 1 } },
      });
    }
    return {
      favorited: false,
      favoriteCount: await this.getRoomFavoriteCount(roomId),
    };
  }

  /**
   * 获取当前用户对某案件的点赞/收藏状态
   */
  async getRoomInteractionStatus(roomId: number, userId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { likeCount: true, favoriteCount: true },
    });
    if (!room) throw new NotFoundException('案件不存在');

    const [likeRel, favoriteRel] = await Promise.all([
      (this.prisma as any).userRelation.findUnique({
        where: {
          userId_targetId_type: { userId, targetId: roomId, type: 'LIKE_ROOM' },
        },
      }),
      (this.prisma as any).userRelation.findUnique({
        where: {
          userId_targetId_type: {
            userId,
            targetId: roomId,
            type: 'FAVORITE_ROOM',
          },
        },
      }),
    ]);

    return {
      liked: !!likeRel,
      favorited: !!favoriteRel,
      likeCount: room.likeCount,
      favoriteCount: room.favoriteCount,
    };
  }

  /**
   * 获取我的收藏列表
   */
  async getMyFavorites(
    userId: number,
    page: number = 1,
    pageSize: number = 12,
  ) {
    const skip = (page - 1) * pageSize;
    const [relations, total] = await Promise.all([
      (this.prisma as any).userRelation.findMany({
        where: { userId, type: 'FAVORITE_ROOM' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: { targetId: true },
      }),
      (this.prisma as any).userRelation.count({
        where: { userId, type: 'FAVORITE_ROOM' },
      }),
    ]);

    const roomIds = relations.map((r: any) => r.targetId);
    if (roomIds.length === 0) {
      return {
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      };
    }

    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        owner: { select: { id: true, email: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
      },
    });

    // 保持收藏时间倒序
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const sorted = roomIds.map((id: number) => roomMap.get(id)).filter(Boolean);

    return {
      data: sorted.map((room: any) => ({
        ...room,
        agents: JSON.parse(room.agents),
        tags: room.tags.map((rt: any) => rt.tag),
        favorited: true,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取我点赞的案件列表
   */
  async getMyLikes(userId: number, page: number = 1, pageSize: number = 12) {
    const skip = (page - 1) * pageSize;
    const [relations, total] = await Promise.all([
      (this.prisma as any).userRelation.findMany({
        where: { userId, type: 'LIKE_ROOM' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: { targetId: true },
      }),
      (this.prisma as any).userRelation.count({
        where: { userId, type: 'LIKE_ROOM' },
      }),
    ]);

    const roomIds = relations.map((r: any) => r.targetId);
    if (roomIds.length === 0) {
      return {
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      };
    }

    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        owner: { select: { id: true, email: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
      },
    });

    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const sorted = roomIds.map((id: number) => roomMap.get(id)).filter(Boolean);

    return {
      data: sorted.map((room: any) => ({
        ...room,
        agents: JSON.parse(room.agents),
        tags: room.tags.map((rt: any) => rt.tag),
        liked: true,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private async getRoomLikeCount(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { likeCount: true },
    });
    return room?.likeCount ?? 0;
  }

  private async getRoomFavoriteCount(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { favoriteCount: true },
    });
    return room?.favoriteCount ?? 0;
  }

  /**
   * 获取所有 Agent
   */
  async getAllAgents() {
    const agents = await this.prisma.agent.findMany({
      where: { isSystem: true },
    });
    return agents;
  }

  /**
   * 结案（幂等）：只有 owner 可操作
   */
  async closeRoom(roomId: number, userId: number) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('案件不存在');
    }
    if (room.ownerId !== userId) {
      throw new ForbiddenException('只有案件创建者才能结案');
    }

    if (room.status === 'CLOSED') {
      return { success: true, status: 'CLOSED' };
    }
    await this.debateService.forceCloseDebate(roomId);

    return { success: true, status: 'CLOSED' };
  }

  /**
   * 获取结案报告
   */
  async getRoomReport(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, email: true, name: true, avatar: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('案件不存在');
    }

    const agentIds: string[] = JSON.parse(room.agents || '[]');
    const agents = await this.prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, avatar: true, personality: true },
    });

    // 辩论回顾：优先从 DB 读取（持久化，重启不丢）
    // 若历史旧数据没有 roundNumber/reasoning，则 roundNumber 可能为 null（前端会分到“无轮次信息”里）
    const dbMessages = await this.prisma.message.findMany({
      where: { roomId, senderType: 'AI' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        botId: true,
        content: true,
        reasoning: true,
        roundNumber: true,
        createdAt: true,
      } as any,
    });

    const debateMessages = dbMessages
      .filter((m: any) => !!m.botId)
      .map((m: any) => ({
        id: String(m.id),
        roundNumber: typeof m.roundNumber === 'number' ? m.roundNumber : 0,
        agentId: String(m.botId),
        content: m.content,
        reasoning: m.reasoning || undefined,
        createdAt: m.createdAt,
      }));

    // 同时回写内存上下文（如果存在），用于 WS 端一致性，但 report 以 DB 为准
    const context = this.debateService.getDebateContext(roomId);
    if (context && (!context.messages || context.messages.length === 0)) {
      context.messages = debateMessages.map((m) => ({
        roundNumber: m.roundNumber,
        agentId: m.agentId,
        content: m.content,
        reasoning: m.reasoning,
        createdAt: new Date(m.createdAt),
      }));
    }

    // Bot C 最终建议（Round 3 优先，否则取 bot_C 最后一条）
    const botCId = agentIds?.[2] || 'bot_C';
    const botCMessages = (debateMessages || []).filter(
      (m) => m.agentId === botCId,
    );
    const round3 = botCMessages.filter((m) => m.roundNumber === 3);
    const finalAdviceMsg =
      (round3.length
        ? round3[round3.length - 1]
        : botCMessages[botCMessages.length - 1]) || null;

    // 投票统计（DB 聚合，持久化）
    const voteStats = await this.prisma.vote.groupBy({
      by: ['agentId'],
      where: { roomId },
      _count: { id: true },
    });

    const countsByAgentId = voteStats.reduce(
      (acc, stat) => {
        acc[stat.agentId] = stat._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalVotes = Object.values(countsByAgentId).reduce(
      (a, b) => a + b,
      0,
    );
    const percentByAgentId: Record<string, number> = {};
    for (const id of agentIds) {
      const c = countsByAgentId[id] || 0;
      percentByAgentId[id] =
        totalVotes > 0 ? Number(((c / totalVotes) * 100).toFixed(1)) : 0;
    }

    const ranking = [...agentIds]
      .map((id) => ({
        agentId: id,
        count: countsByAgentId[id] || 0,
        percent: percentByAgentId[id] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const top = ranking[0];
    const second = ranking[1];
    const winner =
      totalVotes === 0
        ? { type: 'NO_VOTES' as const }
        : second && top.count === second.count
          ? { type: 'TIE' as const, topPercent: top.percent }
          : {
              type: 'WIN' as const,
              agentId: top.agentId,
              topPercent: top.percent,
            };

    return {
      room: {
        id: room.id,
        title: room.title,
        content: room.content,
        status: room.status,
        createdAt: room.createdAt,
        owner: room.owner,
        agents: agents,
      },
      debateMessages,
      finalAdvice: finalAdviceMsg
        ? {
            raw: {
              content: finalAdviceMsg.content,
              reasoning: finalAdviceMsg.reasoning,
            },
          }
        : { raw: null },
      voteStats: {
        totalVotes,
        countsByAgentId,
        percentByAgentId,
        ranking: ranking.map((r, idx) => ({ ...r, rank: idx + 1 })),
        winner,
      },
    };
  }

  private async notifyFollowers(ownerId: number, roomId: number) {
    const followers = await this.prisma.userRelation.findMany({
      where: { targetId: ownerId, type: 'FOLLOW_USER' },
      select: { userId: true },
    });
    if (!followers.length) return;
    await this.prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.userId,
        type: 'FOLLOW_NEW_ROOM',
        fromUserId: ownerId,
        roomId,
      })),
      skipDuplicates: true,
    });
  }
}
