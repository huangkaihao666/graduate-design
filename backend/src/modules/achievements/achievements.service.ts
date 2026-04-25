import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

// 等级经验阈值：level N 需要 N*N*100 总经验
const calcLevel = (totalExp: number): number => {
  let level = 1;
  while ((level + 1) * (level + 1) * 100 <= totalExp) level++;
  return Math.min(level, 99);
};

const expForLevel = (level: number) => level * level * 100;

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 成就定义 ────────────────────────────────────────────────

  getAllAchievements() {
    return this.prisma.achievement.findMany({ orderBy: { expReward: 'asc' } });
  }

  // ─── 用户已解锁成就 ──────────────────────────────────────────

  async getUserAchievements(userId: number) {
    const [user, allAchievements] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { exp: true, level: true, achievements: true },
      }),
      this.prisma.achievement.findMany({ orderBy: { expReward: 'asc' } }),
    ]);

    const unlockedIds: number[] = JSON.parse(user?.achievements || '[]');
    const unlockedSet = new Set(unlockedIds);

    const currentLevel = user?.level ?? 1;
    const currentExp = user?.exp ?? 0;
    const nextLevelExp = expForLevel(currentLevel + 1);
    const currentLevelExp = expForLevel(currentLevel);
    const progress =
      nextLevelExp > currentLevelExp
        ? Math.min(
            Math.round(
              ((currentExp - currentLevelExp) /
                (nextLevelExp - currentLevelExp)) *
                100,
            ),
            100,
          )
        : 100;

    return {
      exp: currentExp,
      level: currentLevel,
      nextLevelExp,
      currentLevelExp,
      progress,
      achievements: allAchievements.map((a) => ({
        ...a,
        unlocked: unlockedSet.has(a.id),
      })),
    };
  }

  // ─── 排行榜 ──────────────────────────────────────────────────

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      orderBy: { exp: 'desc' },
      take: 20,
      select: { id: true, name: true, avatar: true, exp: true, level: true },
    });
    return users.map((u, i) => ({ rank: i + 1, ...u }));
  }

  // ─── 核心：检查并解锁成就 ────────────────────────────────────

  async checkAndUnlock(
    userId: number,
    achievementName: string,
  ): Promise<boolean> {
    const [achievement, user] = await Promise.all([
      this.prisma.achievement.findUnique({ where: { name: achievementName } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { exp: true, level: true, achievements: true },
      }),
    ]);
    if (!achievement || !user) return false;

    const unlocked: number[] = JSON.parse(user.achievements || '[]');
    if (unlocked.includes(achievement.id)) return false;

    unlocked.push(achievement.id);
    const newExp = (user.exp ?? 0) + achievement.expReward;
    const newLevel = calcLevel(newExp);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        achievements: JSON.stringify(unlocked),
        exp: newExp,
        level: newLevel,
      },
    });

    // 站内通知（成就通知无关联案件）
    await (this.prisma as any).notification.create({
      data: {
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        fromUserId: userId,
        roomId: null,
      },
    });

    return true;
  }

  // ─── 批量检查（供各 service 埋点调用） ──────────────────────

  async checkRoomAchievements(userId: number) {
    const count = await this.prisma.room.count({ where: { ownerId: userId } });
    if (count >= 1) await this.checkAndUnlock(userId, '初出茅庐');
    if (count >= 5) await this.checkAndUnlock(userId, '案件达人');
    if (count >= 20) await this.checkAndUnlock(userId, '辩论狂人');

    // 围观量
    const agg = await this.prisma.room.aggregate({
      where: { ownerId: userId },
      _sum: { viewCount: true },
    });
    if ((agg._sum.viewCount ?? 0) >= 500)
      await this.checkAndUnlock(userId, '人气爆棚');
  }

  async checkVoteAchievements(userId: number) {
    const count = await this.prisma.vote.count({ where: { userId } });
    if (count >= 1) await this.checkAndUnlock(userId, '初试牛刀');
    if (count >= 10) await this.checkAndUnlock(userId, '决策达人');
  }

  async checkCounselingAchievements(userId: number) {
    const count = await this.prisma.counselingSession.count({
      where: { userId },
    });
    if (count >= 10) await this.checkAndUnlock(userId, '倾听者');
  }

  async checkKnowledgeAchievements(userId: number) {
    const count = await this.prisma.knowledgeDocument.count({
      where: { knowledgeBase: { userId } },
    });
    if (count >= 1) await this.checkAndUnlock(userId, '知识贡献者');
  }

  async checkAgentAchievements(userId: number) {
    const count = await this.prisma.agent.count({
      where: { creatorId: userId, isSystem: false },
    });
    if (count >= 1) await this.checkAndUnlock(userId, '智能体创造者');
  }

  async checkFollowerAchievements(userId: number) {
    const count = await this.prisma.userRelation.count({
      where: { targetId: userId, type: 'FOLLOW_USER' },
    });
    if (count >= 10) await this.checkAndUnlock(userId, '社交达人');
  }

  async checkRegistrationAchievements(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) return;
    const days =
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days >= 30) await this.checkAndUnlock(userId, '老朋友');
  }
}
