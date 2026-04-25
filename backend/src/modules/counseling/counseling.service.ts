import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { CozeService } from '../rooms/coze.service';
import { AchievementsService } from '@/modules/achievements/achievements.service';

const COUNSELOR_BOT_ID = '7632299425355792393';

@Injectable()
export class CounselingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cozeService: CozeService,
    @Optional() private readonly achievementsService?: AchievementsService,
  ) {}

  async getSessions(userId: number) {
    const sessions = await (this.prisma as any).counselingSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });

    return sessions.map((s: any) => ({
      id: s.id,
      title: s.title || '新的对话',
      summary: s.summary,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      roomId: s.roomId,
      roomTitle: s.roomTitle,
      messageCount: s._count.messages,
    }));
  }

  async createSession(
    userId: number,
    data: { roomId?: number; roomTitle?: string; sentimentRecordId?: number },
  ) {
    const session = await (this.prisma as any).counselingSession.create({
      data: {
        userId,
        roomId: data.roomId || null,
        roomTitle: data.roomTitle || null,
        sentimentRecordId: data.sentimentRecordId || null,
        status: 'ACTIVE',
        title: '新的对话',
      },
    });
    this.achievementsService
      ?.checkCounselingAchievements(userId)
      .catch(() => {});
    return session;
  }

  async getMessages(sessionId: number, userId: number) {
    await this.ensureOwner(sessionId, userId);
    const messages = await (this.prisma as any).counselingMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return messages;
  }

  async sendMessage(
    sessionId: number,
    userId: number,
    content: string,
    res: Response,
  ) {
    const session = await this.ensureOwner(sessionId, userId);

    // 保存用户消息
    await (this.prisma as any).counselingMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    // 如果是第一条消息，用前20字更新会话标题
    const msgCount = await (this.prisma as any).counselingMessage.count({
      where: { sessionId },
    });
    if (msgCount === 1) {
      await (this.prisma as any).counselingSession.update({
        where: { id: sessionId },
        data: { title: content.slice(0, 20) },
      });
    }

    // 更新 updatedAt
    await (this.prisma as any).counselingSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // 获取历史消息（最近20条，控制 token 用量）
    const allMessages = await (this.prisma as any).counselingMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const history = allMessages.map((m: any) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    // 构建系统补充 prompt（携带案件上下文）
    const systemExtra = await this.buildSystemExtra(session);

    // SSE 流式返回
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    let fullContent = '';

    try {
      await this.cozeService.streamCounselorChat(
        COUNSELOR_BOT_ID,
        history,
        systemExtra,
        (chunk) => {
          if (chunk.kind === 'answer') {
            fullContent += chunk.text;
            res.write(
              `data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`,
            );
          } else {
            // 思考阶段只发信号，不发内容
            res.write(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`);
          }
        },
      );
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: '回复生成失败，请重试' })}\n\n`,
      );
      res.end();
      return;
    }

    // 保存 AI 回复
    await (this.prisma as any).counselingMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: fullContent },
    });

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }

  async closeSession(sessionId: number, userId: number) {
    await this.ensureOwner(sessionId, userId);
    await (this.prisma as any).counselingSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' },
    });
    return { success: true };
  }

  async deleteSession(sessionId: number, userId: number) {
    await this.ensureOwner(sessionId, userId);
    await (this.prisma as any).counselingSession.delete({
      where: { id: sessionId },
    });
    return { success: true };
  }

  private async ensureOwner(sessionId: number, userId: number) {
    const session = await (this.prisma as any).counselingSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId)
      throw new ForbiddenException('无权访问此会话');
    return session;
  }

  private async buildSystemExtra(session: any): Promise<string> {
    if (!session.roomId) return '';

    try {
      const room = await this.prisma.room.findUnique({
        where: { id: session.roomId },
        select: { title: true, content: true },
      });
      if (!room) return '';

      return `【用户关联的困境案件】\n案件标题：${room.title}\n案件描述：${room.content}\n请结合以上背景给予针对性疏导，无需用户重复描述背景。`;
    } catch {
      return '';
    }
  }
}
