import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import * as bcrypt from 'bcrypt';

const FOLLOW_TYPE = 'FOLLOW_USER';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<any> {
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: number): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateData: Partial<CreateUserDto>): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number): Promise<any> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  private sanitizeUser(user: any) {
    if (!user) return user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  async updateProfile(
    targetUserId: number,
    actorUserId: number,
    dto: UpdateProfileDto,
  ) {
    if (targetUserId !== actorUserId) {
      throw new ForbiddenException('只能修改自己的资料');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: dto.name ?? undefined,
        avatar: dto.avatar ?? undefined,
        bio: dto.bio ?? undefined,
      },
    });

    return this.sanitizeUser(updated);
  }

  async updatePassword(
    targetUserId: number,
    actorUserId: number,
    dto: UpdatePasswordDto,
  ) {
    if (targetUserId !== actorUserId) {
      throw new ForbiddenException('只能修改自己的密码');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException('用户不存在');

    const ok = await bcrypt.compare(dto.oldPassword, user.password);
    if (!ok) throw new BadRequestException('旧密码不正确');

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashed },
    });

    return { success: true };
  }

  async getUserRooms(
    targetUserId: number,
    actorUserId: number,
    params: { page?: number; pageSize?: number; status?: string },
  ) {
    if (targetUserId !== actorUserId) {
      throw new ForbiddenException('只能查看自己的案件列表');
    }

    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const where: any = { ownerId: targetUserId };
    if (params.status) where.status = params.status;

    const [total, rooms] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const totalViewCount = await this.prisma.room.aggregate({
      where: { ownerId: targetUserId },
      _sum: { viewCount: true },
    });

    return {
      data: rooms.map((r) => ({ ...r, agents: JSON.parse(r.agents || '[]') })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalPublished: total,
        totalViews: totalViewCount._sum.viewCount || 0,
      },
    };
  }

  async getUserVotes(
    targetUserId: number,
    actorUserId: number,
    params: { page?: number; pageSize?: number },
  ) {
    if (targetUserId !== actorUserId) {
      throw new ForbiddenException('只能查看自己的投票历史');
    }

    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const [total, votes, agents] = await Promise.all([
      this.prisma.vote.count({ where: { userId: targetUserId } }),
      this.prisma.vote.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          room: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              ownerId: true,
            },
          },
        },
      }),
      this.prisma.agent.findMany({
        select: { id: true, name: true, avatar: true, personality: true },
      }),
    ]);

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return {
      data: votes.map((v) => ({
        id: v.id,
        room: v.room,
        agent: agentMap.get(v.agentId) || { id: v.agentId, name: v.agentId },
        createdAt: v.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserDiagnosis(targetUserId: number, actorUserId: number) {
    if (targetUserId !== actorUserId) {
      throw new ForbiddenException('只能查看自己的性格诊断');
    }

    const votes = await this.prisma.vote.findMany({
      where: { userId: targetUserId },
      select: { agentId: true },
    });

    const total = votes.length;
    if (total === 0) {
      return {
        totalVotes: 0,
        radar: [
          { name: '理性度', value: 50 },
          { name: '共情度', value: 50 },
          { name: '现实度', value: 50 },
          { name: '风险度', value: 50 },
        ],
        tips: '暂无投票历史，先随便参与几次辩论投票后再来看看你的画像。',
      };
    }

    const agents = await this.prisma.agent.findMany({
      where: { id: { in: Array.from(new Set(votes.map((v) => v.agentId))) } },
      select: { id: true, personality: true, name: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    let rational = 0;
    let empathy = 0;
    let realism = 0;

    for (const v of votes) {
      const a = agentMap.get(v.agentId);
      const p = (a?.personality || a?.name || '').toString();
      if (p.includes('律师') || p.includes('理性') || p.includes('逻辑'))
        rational += 1;
      else if (p.includes('共情') || p.includes('温柔') || p.includes('倾听'))
        empathy += 1;
      else if (p.includes('现实') || p.includes('毒舌') || p.includes('直白'))
        realism += 1;
      else rational += 1; // 默认偏理性
    }

    const r = rational / total;
    const e = empathy / total;
    const re = realism / total;
    const risk = Math.min(1, re * 0.7 + r * 0.3);

    return {
      totalVotes: total,
      radar: [
        { name: '理性度', value: Math.round(r * 100) },
        { name: '共情度', value: Math.round(e * 100) },
        { name: '现实度', value: Math.round(re * 100) },
        { name: '风险度', value: Math.round(risk * 100) },
      ],
      breakdown: {
        rational,
        empathy,
        realism,
      },
    };
  }

  // ─── 关注 / 取关 ────────────────────────────────────────────

  async followUser(actorId: number, targetId: number) {
    if (actorId === targetId) throw new BadRequestException('不能关注自己');
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('用户不存在');

    await this.prisma.userRelation.upsert({
      where: {
        userId_targetId_type: { userId: actorId, targetId, type: FOLLOW_TYPE },
      },
      create: { userId: actorId, targetId, type: FOLLOW_TYPE },
      update: {},
    });
    return { success: true };
  }

  async unfollowUser(actorId: number, targetId: number) {
    await this.prisma.userRelation.deleteMany({
      where: { userId: actorId, targetId, type: FOLLOW_TYPE },
    });
    return { success: true };
  }

  async getFollowers(targetId: number) {
    const rows = await this.prisma.userRelation.findMany({
      where: { targetId, type: FOLLOW_TYPE },
      include: {
        user: { select: { id: true, name: true, avatar: true, bio: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.user);
  }

  async getFollowing(userId: number) {
    const rows = await this.prisma.userRelation.findMany({
      where: { userId, type: FOLLOW_TYPE },
      orderBy: { createdAt: 'desc' },
    });
    const targetIds = rows.map((r) => r.targetId);
    if (!targetIds.length) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, name: true, avatar: true, bio: true },
    });
    return users;
  }

  async getFollowCounts(userId: number) {
    const [followers, following] = await Promise.all([
      this.prisma.userRelation.count({
        where: { targetId: userId, type: FOLLOW_TYPE },
      }),
      this.prisma.userRelation.count({ where: { userId, type: FOLLOW_TYPE } }),
    ]);
    return { followers, following };
  }

  async isFollowing(actorId: number, targetId: number) {
    const rel = await this.prisma.userRelation.findUnique({
      where: {
        userId_targetId_type: { userId: actorId, targetId, type: FOLLOW_TYPE },
      },
    });
    return { following: !!rel };
  }

  // ─── 关注动态流 ──────────────────────────────────────────────

  async getFeed(userId: number, params: { page?: number; pageSize?: number }) {
    const page = Math.max(Number(params.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || 20), 1), 50);
    const skip = (page - 1) * pageSize;

    const following = await this.prisma.userRelation.findMany({
      where: { userId, type: FOLLOW_TYPE },
      select: { targetId: true },
    });
    const followingIds = following.map((r) => r.targetId);

    if (!followingIds.length) {
      return {
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      };
    }

    const where = { ownerId: { in: followingIds } };
    const [total, rooms] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { owner: { select: { id: true, name: true, avatar: true } } },
      }),
    ]);

    return {
      data: rooms.map((r) => ({ ...r, agents: JSON.parse(r.agents || '[]') })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ─── 触发关注通知（供 RoomsService 调用） ───────────────────

  async notifyFollowersNewRoom(ownerId: number, roomId: number) {
    const followers = await this.prisma.userRelation.findMany({
      where: { targetId: ownerId, type: FOLLOW_TYPE },
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

  async getUserStats(targetUserId: number, actorUserId: number) {
    if (targetUserId !== actorUserId) {
      throw new ForbiddenException('只能查看自己的统计信息');
    }

    const [roomsCount, votesCount, roomsViewsSum] = await Promise.all([
      this.prisma.room.count({ where: { ownerId: targetUserId } }),
      this.prisma.vote.count({ where: { userId: targetUserId } }),
      this.prisma.room.aggregate({
        where: { ownerId: targetUserId },
        _sum: { viewCount: true, commentCount: true },
      }),
    ]);

    const views = roomsViewsSum._sum.viewCount || 0;
    const comments = roomsViewsSum._sum.commentCount || 0;

    const activityScore =
      roomsCount * 3 +
      votesCount * 1 +
      Math.floor(views / 50) +
      Math.floor(comments / 10);

    const level =
      activityScore >= 120
        ? { name: '钻石', color: 'purple' }
        : activityScore >= 60
          ? { name: '黄金', color: 'gold' }
          : activityScore >= 25
            ? { name: '白银', color: 'blue' }
            : { name: '青铜', color: 'default' };

    const badges = [
      { key: 'first_vote', name: '初试牛刀', achieved: votesCount >= 1 },
      { key: 'five_votes', name: '决策达人', achieved: votesCount >= 5 },
      { key: 'first_room', name: '开庭啦', achieved: roomsCount >= 1 },
      { key: 'five_rooms', name: '案件制造机', achieved: roomsCount >= 5 },
      { key: 'popular', name: '人气爆棚', achieved: views >= 500 },
    ];

    return {
      roomsCount,
      votesCount,
      views,
      comments,
      activityScore,
      level,
      badges,
    };
  }
}
