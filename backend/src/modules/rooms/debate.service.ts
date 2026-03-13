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
    this.logger.log(`Executing Round 1 for room ${roomId}`);

    const agents = JSON.parse(room.agents);
    const botA = agents[0];
    const botB = agents[1];

    const caseInfo = {
      title: room.title,
      content: room.content,
    };

    // 并发调用 Bot A 和 Bot B
    await Promise.all([
      this.streamAgentResponse(roomId, botA, caseInfo, [], 1),
      this.streamAgentResponse(roomId, botB, caseInfo, [], 1),
    ]);

    // Round 1 完成后，等待 2 秒，然后执行 Round 2
    await this.delay(2000);
    await this.executeRound2(roomId, room);
  }

  /**
   * Round 2: Bot A 和 Bot B 交叉反驳
   */
  private async executeRound2(roomId: number, room: any): Promise<void> {
    this.logger.log(`Executing Round 2 for room ${roomId}`);

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

    // 并发调用
    await Promise.all([
      this.streamAgentResponse(roomId, botA, caseInfo, botAContext, 2),
      this.streamAgentResponse(roomId, botB, caseInfo, botBContext, 2),
    ]);

    // Round 2 完成后，执行 Round 3
    await this.delay(2000);
    await this.executeRound3(roomId, room);
  }

  /**
   * Round 3: Bot C 总结
   */
  private async executeRound3(roomId: number, room: any): Promise<void> {
    this.logger.log(`Executing Round 3 for room ${roomId}`);

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

    // Bot C 总结
    await this.streamAgentResponse(roomId, botC, caseInfo, allMessages, 3);

    // 辩论结束
    await this.finishDebate(roomId);
  }

  /**
   * 流式发送 Agent 响应
   */
  private async streamAgentResponse(
    roomId: number,
    agentId: string,
    caseInfo: { title: string; content: string },
    context: Array<{ agentId: string; content: string }>,
    roundNumber: number,
  ): Promise<void> {
    const debateContext = this.debateContexts.get(roomId);
    if (!debateContext) return;

    // 广播"正在输入"状态
    this.roomsGateway.broadcastToRoom(roomId, 'agentTyping', {
      agentId,
      roomId,
    });

    let fullContent = '';

    // 调用 Coze API（模拟）
    const prompt = this.cozeService.buildPrompt(caseInfo, context, agentId);

    await this.cozeService.streamChat(agentId, prompt, (chunk: string) => {
      fullContent += chunk;

      // 实时广播 chunk
      this.roomsGateway.broadcastToRoom(roomId, 'messageChunk', {
        agentId,
        chunk,
        roomId,
        roundNumber,
      });
    });

    // 保存完整消息到上下文
    debateContext.messages.push({
      roundNumber,
      agentId,
      content: fullContent,
      createdAt: new Date(),
    });

    // 保存到数据库
    await this.prisma.message.create({
      data: {
        roomId,
        content: fullContent,
        senderType: 'AI',
        botId: agentId, // AI 消息使用 botId 字段
        senderId: null, // AI 消息没有 senderId
      },
    });

    // 广播消息完成
    this.roomsGateway.broadcastToRoom(roomId, 'messageComplete', {
      agentId,
      roomId,
      roundNumber,
      content: fullContent,
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
