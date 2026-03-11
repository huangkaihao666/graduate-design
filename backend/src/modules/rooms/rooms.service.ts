import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
