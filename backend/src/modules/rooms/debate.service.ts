import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CozeService } from './coze.service';
import { RoomsGateway } from './rooms.gateway';

interface DebateContext {
  roomId: number;
  currentRound: number;
  status: 'WAITING' | 'RUNNING' | 'PAUSED' | 'FINISHED';
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

    // 初始化辩论上下文
    const context: DebateContext = {
      roomId,
      currentRound: 1,
      status: 'RUNNING',
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

    const caseInfo = {
      title: room.title,
      content: room.content,
    };

    // 方案一：严格交替发言（A → B）
    this.roomsGateway.broadcastToRoom(roomId, 'roundChanged', {
      roomId,
      round: 1,
    });
    await this.streamAgentResponse(roomId, botA, caseInfo, [], 1, 'statement');
    await this.streamAgentResponse(roomId, botB, caseInfo, [], 1, 'statement');

    // Round 1 完成后，等待 2 秒，然后执行 Round 2
    await this.delay(2000);
    await this.executeRound2(roomId, room);
  }

  /**
   * Round 2: Bot A 和 Bot B 交叉反驳
   */
  private async executeRound2(roomId: number, room: any): Promise<void> {
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

    // 获取 Round 1 的消息
    const round1Messages = context.messages.filter((m) => m.roundNumber === 1);

    // Bot A 看到 Bot B 的观点，Bot B 看到 Bot A 的观点
    const botAContext = round1Messages.filter((m) => m.agentId === botB);
    const botBContext = round1Messages.filter((m) => m.agentId === botA);

    // 广播 Round 2 开始
    this.roomsGateway.broadcastToRoom(roomId, 'roundChanged', {
      roomId,
      round: 2,
    });

    // 方案一：交叉反驳（严格交替：B 反驳 A → A 反驳 B）
    await this.streamAgentResponse(
      roomId,
      botB,
      caseInfo,
      botBContext,
      2,
      'rebuttal',
    );
    await this.streamAgentResponse(
      roomId,
      botA,
      caseInfo,
      botAContext,
      2,
      'rebuttal',
    );

    // Round 2 完成后，执行 Round 3
    await this.delay(2000);
    await this.executeRound3(roomId, room);
  }

  /**
   * Round 3: Bot C 总结
   */
  private async executeRound3(roomId: number, room: any): Promise<void> {
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

    // Bot C 看到所有之前的消息
    const allMessages = context.messages;

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
      allMessages,
      3,
      'verdict',
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
    const prompt = this.cozeService.buildPrompt(caseInfo, context, roleName, {
      roundNumber,
      phase,
      speakingOrderHint,
      maxChars: phase === 'verdict' ? 1200 : 900,
    });
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
   * 结束辩论
   */
  private async finishDebate(roomId: number): Promise<void> {
    this.logger.log(`Finishing debate for room ${roomId}`);

    const context = this.debateContexts.get(roomId);
    if (context) {
      context.status = 'FINISHED';
    }

    // 更新房间状态
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'CLOSED' },
    });

    // 广播辩论结束
    this.roomsGateway.broadcastToRoom(roomId, 'debateFinished', {
      roomId,
    });
  }

  /**
   * 强制结案（用于手动结案/生成报告）
   * - 幂等：已 CLOSED 仍返回成功
   * - 会广播 debateFinished，方便前端即时切换到 CLOSED
   */
  async forceCloseDebate(roomId: number): Promise<void> {
    this.logger.log(`Force closing debate for room ${roomId}`);

    const context = this.debateContexts.get(roomId);
    if (context) {
      context.status = 'FINISHED';
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'CLOSED' },
    });

    this.roomsGateway.broadcastToRoom(roomId, 'debateFinished', { roomId });
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
