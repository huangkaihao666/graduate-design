import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { CozeService } from './coze.service';
import { RoomsGateway } from './rooms.gateway';
import { RagService } from '@/modules/rag/rag.service';

interface DebateContext {
  roomId: number;
  currentRound: number;
  status: 'WAITING' | 'RUNNING' | 'PAUSED' | 'FINISHED';
  collectingOpinions: boolean; // Round1 后的 60 秒征集窗口
  agentAName: string; // A 方智能体显示名，供立场识别使用
  agentBName: string; // B 方智能体显示名，供立场识别使用
  messages: Array<{
    roundNumber: number;
    agentId: string;
    content: string;
    reasoning?: string;
    createdAt: Date;
  }>;
}

/**
 * 辩论流程编排服务
 */
@Injectable()
export class DebateService {
  private readonly logger = new Logger(DebateService.name);

  // 内存中存储辩论上下文
  private debateContexts: Map<number, DebateContext> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cozeService: CozeService,
    private readonly roomsGateway: RoomsGateway,
    private readonly ragService: RagService,
  ) {}

  /**
   * 开始辩论
   */
  async startDebate(roomId: number): Promise<void> {
    this.logger.log(`Starting debate for room ${roomId}`);

    // 获取房间信息
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    // 初始化辩论上下文（agentAName/agentBName 在 executeRound1 查到后写入）
    const context: DebateContext = {
      roomId,
      currentRound: 1,
      status: 'RUNNING',
      collectingOpinions: false,
      agentAName: '',
      agentBName: '',
      messages: [],
    };
    this.debateContexts.set(roomId, context);

    // 更新房间状态
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'LIVE' },
    });

    // 广播辩论开始
    this.roomsGateway.broadcastToRoom(roomId, 'debateStarted', {
      roomId,
      round: 1,
    });

    // 执行 Round 1
    await this.executeRound1(roomId, room);
  }

  /**
   * Round 1: Bot A 和 Bot B 并发发言
   */
  private async executeRound1(roomId: number, room: any): Promise<void> {
    this.logger.log(`🟦 Executing Round 1 for room ${roomId}`);

    const agents = JSON.parse(room.agents);
    const botA = agents[0];
    const botB = agents[1];

    // 查出双方智能体的显示名，用于立场识别和前端提示
    const [agentARecord, agentBRecord] = await Promise.all([
      this.prisma.agent.findUnique({
        where: { id: botA },
        select: { name: true },
      }),
      this.prisma.agent.findUnique({
        where: { id: botB },
        select: { name: true },
      }),
    ]);
    const agentAName = agentARecord?.name ?? botA;
    const agentBName = agentBRecord?.name ?? botB;

    // 写入 context，供 gateway 实时处理单条弹幕时使用
    const ctx = this.debateContexts.get(roomId);
    if (ctx) {
      ctx.agentAName = agentAName;
      ctx.agentBName = agentBName;
    }

    const caseInfo = {
      title: room.title,
      content: room.content,
    };

    // 严格交替发言（A → B）
    this.roomsGateway.broadcastToRoom(roomId, 'roundChanged', {
      roomId,
      round: 1,
    });
    await this.streamAgentResponse(roomId, botA, caseInfo, [], 1, 'statement');
    await this.streamAgentResponse(roomId, botB, caseInfo, [], 1, 'statement');

    // ── 用户观点征集窗口（60 秒）──
    const COLLECT_DURATION = 60; // 秒
    const context = this.debateContexts.get(roomId);
    if (context) context.collectingOpinions = true;

    // 广播征集开始，同时告知前端双方名字，用于引导用户表态
    this.roomsGateway.broadcastToRoom(roomId, 'opinionCollectStart', {
      roomId,
      duration: COLLECT_DURATION,
      agentAName,
      agentBName,
    });

    await this.delay(COLLECT_DURATION * 1000);

    if (context) context.collectingOpinions = false;

    // 取所有弹幕，对尚未被 RAG 处理的（默认值 isRelevant=true + stance=NEUTRAL）做兜底过滤
    const allOpinions = await (this.prisma as any).userOpinion.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });

    // 找出还没被 RAG 处理的（仍是默认值：isRelevant=true 且 stance=NEUTRAL）
    const unprocessed = allOpinions.filter(
      (o: any) => o.isRelevant === true && o.stance === 'NEUTRAL',
    );

    if (unprocessed.length > 0) {
      // 兜底：批量调 RAG 重新过滤，超时则保留默认值
      const ragResult = await this.ragService.batchFilter(
        unprocessed.map((o: any) => ({
          id: o.id,
          content: o.content,
          userId: o.userId,
        })),
        room.title,
        agentAName,
        agentBName,
      );

      // 将 RAG 结果回写数据库
      const updates: Promise<any>[] = [];
      for (const group of [
        { items: ragResult.forA, stance: 'SUPPORT_A', isRelevant: true },
        { items: ragResult.forB, stance: 'SUPPORT_B', isRelevant: true },
        { items: ragResult.neutral, stance: 'NEUTRAL', isRelevant: true },
      ]) {
        for (const item of group.items) {
          updates.push(
            (this.prisma as any).userOpinion
              .update({
                where: { id: item.id },
                data: { stance: group.stance, isRelevant: group.isRelevant },
              })
              .catch(() => {}),
          );
        }
      }
      // 被过滤的灌水标记为 isRelevant=false
      const validIds = new Set([
        ...ragResult.forA.map((o: any) => o.id),
        ...ragResult.forB.map((o: any) => o.id),
        ...ragResult.neutral.map((o: any) => o.id),
      ]);
      for (const op of unprocessed) {
        if (!validIds.has(op.id)) {
          updates.push(
            (this.prisma as any).userOpinion
              .update({
                where: { id: op.id },
                data: { isRelevant: false },
              })
              .catch(() => {}),
          );
        }
      }
      await Promise.all(updates);
    }

    // 读取最终有效观点（RAG 已处理完毕，取全部有效观点最多20条）
    const opinions = await (this.prisma as any).userOpinion.findMany({
      where: { roomId, isRelevant: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // RAG 立场分组仅用于日志和广播统计，不再用于分配给对应 bot
    const forA = opinions.filter((o: any) => o.stance === 'SUPPORT_A');
    const forB = opinions.filter((o: any) => o.stance === 'SUPPORT_B');
    const neutral = opinions.filter((o: any) => o.stance === 'NEUTRAL');

    this.logger.log(
      `[RAG] room ${roomId} 观点收集结果 → ` +
        `有效:${opinions.length} 条（RAG参考：支持A:${forA.length} 支持B:${forB.length} 中立:${neutral.length}）` +
        `，全部注入智能体由其自行判断立场`,
    );

    this.roomsGateway.broadcastToRoom(roomId, 'opinionCollectEnd', {
      roomId,
      validCount: opinions.length,
      validForA: forA.length,
      validForB: forB.length,
    });

    await this.delay(2000);
    // 把全部有效观点传下去，不按立场拆分
    await this.executeRound2(roomId, room, opinions);
  }

  /**
   * Round 2: Bot A 和 Bot B 交叉反驳（注入全量有效用户观点）
   */
  private async executeRound2(
    roomId: number,
    room: any,
    validOpinions: any[] = [],
  ): Promise<void> {
    this.logger.log(`🟩 Executing Round 2 for room ${roomId}`);

    const context = this.debateContexts.get(roomId);
    if (!context) return;

    context.currentRound = 2;

    const agents = JSON.parse(room.agents);
    const botA = agents[0];
    const botB = agents[1];

    const caseInfo = {
      title: room.title,
      content: room.content,
    };

    const round1Messages = context.messages.filter((m) => m.roundNumber === 1);
    // 全量有效观点文本，两个 bot 都看到相同的内容，由智能体自行判断哪些支持自己
    const allAudienceOpinions = validOpinions.map((o: any) => o.content);

    const botBAgentContext = round1Messages.filter((m) => m.agentId === botA);
    const botAAgentContext = round1Messages.filter((m) => m.agentId === botB);

    this.roomsGateway.broadcastToRoom(roomId, 'roundChanged', {
      roomId,
      round: 2,
    });

    await this.streamAgentResponse(
      roomId,
      botB,
      caseInfo,
      botBAgentContext,
      2,
      'rebuttal',
      allAudienceOpinions,
    );
    await this.streamAgentResponse(
      roomId,
      botA,
      caseInfo,
      botAAgentContext,
      2,
      'rebuttal',
      allAudienceOpinions,
    );

    await this.delay(2000);
    await this.executeRound3(roomId, room, validOpinions);
  }

  /**
   * Round 3: Bot C 综合裁决（引用全量有效用户观点）
   */
  private async executeRound3(
    roomId: number,
    room: any,
    validOpinions: any[] = [],
  ): Promise<void> {
    this.logger.log(`🟥 Executing Round 3 for room ${roomId}`);

    const context = this.debateContexts.get(roomId);
    if (!context) return;

    context.currentRound = 3;

    const agents = JSON.parse(room.agents);
    const botC = agents[2];

    const caseInfo = {
      title: room.title,
      content: room.content,
    };

    // Bot C 看到前两轮所有智能体发言（不含 audience 混入的旧数据）
    const allAgentMessages = context.messages.filter(
      (m) => m.agentId !== 'audience',
    );

    // 全量有效观点整理为文字行传给 buildPrompt，Bot C 自行分析民意分布
    const verdictAudienceLines: string[] = [];
    if (validOpinions.length > 0) {
      verdictAudienceLines.push(
        `共收到 ${validOpinions.length} 条有效观众观点（已过滤灌水），请自行判断各观点的立场倾向：`,
      );
      validOpinions.forEach((o: any, i: number) => {
        verdictAudienceLines.push(`${i + 1}. "${o.content}"`);
      });
    }

    // 广播 Round 3 开始
    this.roomsGateway.broadcastToRoom(roomId, 'roundChanged', {
      roomId,
      round: 3,
    });

    // Bot C 裁决总结（只发一次）
    await this.streamAgentResponse(
      roomId,
      botC,
      caseInfo,
      allAgentMessages,
      3,
      'verdict',
      verdictAudienceLines,
    );

    // 辩论结束
    await this.finishDebate(roomId);
  }

  /**
   * 流式发送 Agent 响应
   */
  private async streamAgentResponse(
    roomId: number,
    agentId: string, // 逻辑上的 Agent 标识（如 bot_A / bot_B / bot_C）
    caseInfo: { title: string; content: string },
    context: Array<{ agentId: string; content: string }>,
    roundNumber: number,
    phase: 'statement' | 'rebuttal' | 'verdict',
    audienceOpinions?: string[], // Round2 专用：经 RAG 过滤后支持己方的观众观点
  ): Promise<void> {
    const debateContext = this.debateContexts.get(roomId);
    if (!debateContext) return;

    // 广播"正在输入"状态
    this.roomsGateway.broadcastToRoom(roomId, 'agentTyping', {
      agentId,
      roomId,
    });

    let fullAnswer = '';
    let fullReasoning = '';

    // 将逻辑 Agent 标识映射到具体的 Coze bot_id
    const cozeBotIdMap: Record<string, string> = {
      bot_A: '7613771804259581971', // 毒舌现实主义者
      bot_B: '7616710739609075752', // 温柔共情者
      bot_C: '7616712140996902922', // 理智律师
    };
    const botId = cozeBotIdMap[agentId] || agentId;

    const roleDisplayMap: Record<string, string> = {
      bot_A: '毒舌现实主义者（A）',
      bot_B: '温柔共情者（B）',
      bot_C: '理智律师（C）',
    };
    const roleName = roleDisplayMap[agentId] || agentId;

    const speakingOrderHint =
      phase === 'statement'
        ? 'Round1：A 先发言，B 后发言（交替）'
        : phase === 'rebuttal'
          ? 'Round2：先由 B 反驳 A，再由 A 反驳 B（交替）'
          : 'Round3：律师 C 汇总裁决（只发一次）';

    // 调用 Coze API（Prompt 里带轮次与阶段约束）
    const prompt = this.cozeService.buildPrompt(
      caseInfo,
      context,
      roleName,
      {
        roundNumber,
        phase,
        speakingOrderHint,
        maxChars: phase === 'verdict' ? 1200 : 900,
      },
      audienceOpinions,
    );
    this.logger.log(
      `📨 [room ${roomId}] round ${roundNumber} calling agent ${agentId} (botId=${botId}). Case title: ${caseInfo.title}`,
    );

    await this.cozeService.streamChat(botId, prompt, (chunk) => {
      if (chunk.kind === 'reasoning') {
        fullReasoning += chunk.text;
      } else {
        fullAnswer += chunk.text;
      }

      // 实时广播 chunk（区分 reasoning / answer）
      this.roomsGateway.broadcastToRoom(roomId, 'messageChunk', {
        agentId,
        kind: chunk.kind,
        chunk: chunk.text,
        roomId,
        roundNumber,
      });
    });

    // 保存完整消息到上下文
    debateContext.messages.push({
      roundNumber,
      agentId,
      content: fullAnswer,
      reasoning: fullReasoning,
      createdAt: new Date(),
    });

    // 保存到数据库
    await this.prisma.message.create({
      // Prisma Client 类型在部分环境会滞后（db push 后 TS 未刷新），这里显式放宽类型
      data: {
        roomId,
        content: fullAnswer,
        reasoning: fullReasoning || null,
        roundNumber,
        senderType: 'AI',
        botId: agentId, // AI 消息使用 botId 字段
        senderId: null, // AI 消息没有 senderId
      } as any,
    });

    // 广播消息完成
    this.roomsGateway.broadcastToRoom(roomId, 'messageComplete', {
      agentId,
      roomId,
      roundNumber,
      content: fullAnswer,
      reasoning: fullReasoning,
    });
  }

  /**
   * 更新所有参与 Agent 的统计数据（参与次数 + 胜率）
   * - 所有参与 Agent 的 participateCount + 1
   * - 胜者 winRate 用滚动平均更新：newWinRate = (oldWinRate * oldCount + 1) / newCount
   * - 负者 winRate 同步衰减：newWinRate = (oldWinRate * oldCount) / newCount
   * - 平票/无投票：只更新 participateCount，不更新 winRate
   */
  private async updateAgentStats(roomId: number): Promise<void> {
    try {
      // 读取房间的 agents 列表
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        select: { agents: true },
      });
      if (!room) return;

      const agentIds: string[] = JSON.parse(room.agents || '[]');
      if (agentIds.length === 0) return;

      // 统计本次投票结果
      const voteStats = await this.prisma.vote.groupBy({
        by: ['agentId'],
        where: { roomId },
        _count: { id: true },
      });

      const countsByAgentId: Record<string, number> = {};
      for (const stat of voteStats) {
        countsByAgentId[stat.agentId] = stat._count.id;
      }
      const totalVotes = Object.values(countsByAgentId).reduce(
        (a, b) => a + b,
        0,
      );

      // 确定胜者（唯一最高票）
      let winnerId: string | null = null;
      if (totalVotes > 0) {
        const sorted = [...agentIds].sort(
          (a, b) => (countsByAgentId[b] || 0) - (countsByAgentId[a] || 0),
        );
        const topCount = countsByAgentId[sorted[0]] || 0;
        const secondCount = countsByAgentId[sorted[1]] || 0;
        // 仅在唯一最高票时才计入胜率
        if (topCount > secondCount) {
          winnerId = sorted[0];
        }
      }

      // 批量更新各 Agent
      const agents = await this.prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, winRate: true, participateCount: true },
      });

      await Promise.all(
        agents.map((agent) => {
          const newCount = agent.participateCount + 1;
          let newWinRate: number;

          if (winnerId === null) {
            // 无投票或平票：participateCount +1，winRate 不变
            newWinRate = agent.winRate;
          } else if (agent.id === winnerId) {
            // 胜者：滚动平均加 1 场胜利
            newWinRate =
              (agent.winRate * agent.participateCount + 1) / newCount;
          } else {
            // 败者：滚动平均加 0 场胜利
            newWinRate = (agent.winRate * agent.participateCount) / newCount;
          }

          // 保留 4 位小数，限制在 [0, 1] 范围
          newWinRate = Math.min(1, Math.max(0, Number(newWinRate.toFixed(4))));

          return this.prisma.agent.update({
            where: { id: agent.id },
            data: {
              participateCount: newCount,
              winRate: newWinRate,
            },
          });
        }),
      );

      this.logger.log(
        `Updated agent stats for room ${roomId}: winner=${winnerId ?? 'none'}, agents=${agentIds.join(',')}`,
      );
    } catch (err) {
      // 统计更新失败不影响主流程
      this.logger.error(`Failed to update agent stats for room ${roomId}`, err);
    }
  }

  /**
   * 结束辩论
   * 流程：广播投票窗口开启 → 30秒后计算胜率 → 更新DB → 广播 debateFinished
   */
  private async finishDebate(roomId: number): Promise<void> {
    this.logger.log(`Finishing debate for room ${roomId}`);

    const context = this.debateContexts.get(roomId);
    if (context) {
      context.status = 'FINISHED';
    }

    // 广播投票窗口开启（30秒）
    this.roomsGateway.broadcastToRoom(roomId, 'voteWindowOpen', {
      roomId,
      duration: 30,
    });

    // 30秒后关闭投票窗口，计算胜率，更新DB，广播结束
    setTimeout(async () => {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: 'CLOSED' },
      });

      await this.updateAgentStats(roomId);

      this.roomsGateway.broadcastToRoom(roomId, 'debateFinished', { roomId });
    }, 30_000);
  }

  /**
   * 强制结案（用于手动结案/生成报告）
   * - 幂等：已 CLOSED 仍返回成功
   * - 同样走30秒投票窗口流程
   */
  async forceCloseDebate(roomId: number): Promise<void> {
    this.logger.log(`Force closing debate for room ${roomId}`);

    const context = this.debateContexts.get(roomId);
    if (context) {
      context.status = 'FINISHED';
    }

    // 广播投票窗口开启（30秒）
    this.roomsGateway.broadcastToRoom(roomId, 'voteWindowOpen', {
      roomId,
      duration: 30,
    });

    setTimeout(async () => {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: 'CLOSED' },
      });

      await this.updateAgentStats(roomId);

      this.roomsGateway.broadcastToRoom(roomId, 'debateFinished', { roomId });
    }, 30_000);
  }

  /**
   * 暂停辩论
   */
  async pauseDebate(roomId: number): Promise<void> {
    const context = this.debateContexts.get(roomId);
    if (context) {
      context.status = 'PAUSED';
      this.roomsGateway.broadcastToRoom(roomId, 'debatePaused', { roomId });
    }
  }

  /**
   * 继续辩论
   */
  async resumeDebate(roomId: number): Promise<void> {
    const context = this.debateContexts.get(roomId);
    if (context) {
      context.status = 'RUNNING';
      this.roomsGateway.broadcastToRoom(roomId, 'debateResumed', { roomId });
    }
  }

  /**
   * 获取辩论上下文
   */
  getDebateContext(roomId: number): DebateContext | undefined {
    return this.debateContexts.get(roomId);
  }

  /**
   * 当前房间是否处于观点征集窗口
   */
  isCollectingOpinions(roomId: number): boolean {
    return this.debateContexts.get(roomId)?.collectingOpinions ?? false;
  }

  /**
   * 获取本场辩论双方智能体的显示名（供 gateway 实时立场识别使用）
   */
  getAgentNames(roomId: number): { agentAName: string; agentBName: string } {
    const ctx = this.debateContexts.get(roomId);
    return {
      agentAName: ctx?.agentAName ?? '',
      agentBName: ctx?.agentBName ?? '',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
