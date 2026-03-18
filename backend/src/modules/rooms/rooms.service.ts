import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { DebateService } from './debate.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debateService: DebateService,
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
        ...room,
        agents: JSON.parse(room.agents),
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
    const { page = 1, pageSize = 10, status, search, sort } = query;

    const skip = (page - 1) * pageSize;

    // 构建查询条件
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

    // 构建排序
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'hot') {
      orderBy = { viewCount: 'desc' };
    } else if (sort === 'mine' && userId) {
      where.ownerId = userId;
    }

    // 查询总数
    const total = await this.prisma.room.count({ where });

    // 查询数据
    const rooms = await this.prisma.room.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
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

    const formattedRooms = rooms.map((room) => ({
      ...room,
      agents: JSON.parse(room.agents),
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
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        votes: {
          select: {
            agentId: true,
            id: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('案件不存在');
    }

    // 增加浏览数
    await this.prisma.room.update({
      where: { id: roomId },
      data: { viewCount: { increment: 1 } },
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
      agents: JSON.parse(room.agents),
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
   * 获取所有 Agent
   */
  async getAllAgents() {
    const agents = await this.prisma.agent.findMany();
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
}
