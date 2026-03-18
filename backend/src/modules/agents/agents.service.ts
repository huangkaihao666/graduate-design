import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

type AgentSort = 'winRate' | 'participateCount' | 'fans' | 'name';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgents(params: {
    search?: string;
    sort?: AgentSort;
    order?: 'asc' | 'desc';
  }) {
    const { search, sort = 'winRate', order = 'desc' } = params;

    const where: any = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { personality: { contains: search.trim() } },
        { description: { contains: search.trim() } },
      ];
    }

    const orderBy =
      sort === 'name'
        ? { name: order }
        : sort === 'fans'
          ? { fans: order }
          : sort === 'participateCount'
            ? { participateCount: order }
            : { winRate: order };

    return await this.prisma.agent.findMany({
      where,
      orderBy,
    });
  }

  async getAgentById(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundException('Agent 不存在');
    return agent;
  }

  async getAgentCases(id: string, limit = 5) {
    // Room.agents 存的是 JSON 字符串，例如 ["bot_A","bot_B","bot_C"]
    const needle = `"${id}"`;

    const rooms = await this.prisma.room.findMany({
      where: {
        agents: { contains: needle },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 20),
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return rooms.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      owner: r.owner,
    }));
  }
}
