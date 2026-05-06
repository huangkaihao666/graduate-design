import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { CozeService } from '../rooms/coze.service';
import { AchievementsService } from '@/modules/achievements/achievements.service';
import { RagService } from '@/modules/rag/rag.service';
import { Cron } from '@nestjs/schedule';

const DEFAULT_COUNSELOR_BOT_ID = '7636660456002076707';
const DEFAULT_COUNSELOR_NAME = '默认情绪伙伴';

@Injectable()
export class CounselingService {
  private readonly logger = new Logger(CounselingService.name);
  // 预检索缓存：key = sessionId，value = 摘要文本列表
  // sessionId 是自增主键，不同用户天然隔离，无需额外区分
  private prefetchCache = new Map<string, string[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cozeService: CozeService,
    private readonly ragService: RagService,
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
      counselorBotId: s.counselorBotId,
      counselorName: s.counselorName || DEFAULT_COUNSELOR_NAME,
      messageCount: s._count.messages,
    }));
  }

  /** 获取可用辅导师列表：系统默认 + 用户自建已审核通过的智能体 */
  async getAvailableAgents(userId: number) {
    const userAgents = await this.prisma.agent.findMany({
      where: { creatorId: userId, status: 'APPROVED' },
      select: { id: true, name: true, description: true, avatar: true },
    });

    return [
      {
        id: null,
        name: DEFAULT_COUNSELOR_NAME,
        description: '系统内置，挂载心理学知识库，适合大多数倾诉场景',
        avatar: null,
        isSystem: true,
      },
      ...userAgents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        avatar: a.avatar,
        isSystem: false,
      })),
    ];
  }

  async createSession(
    userId: number,
    data: {
      roomId?: number;
      roomTitle?: string;
      sentimentRecordId?: number;
      counselorBotId?: string | null;
    },
  ) {
    // 若指定了自建智能体，校验归属和审核状态
    let counselorBotId: string | null = null;
    let counselorName: string = DEFAULT_COUNSELOR_NAME;
    if (data.counselorBotId) {
      const agent = await this.prisma.agent.findFirst({
        where: {
          id: data.counselorBotId,
          creatorId: userId,
          status: 'APPROVED',
        },
        select: { id: true, name: true },
      });
      if (!agent) {
        throw new Error('所选智能体不存在或未通过审核');
      }
      counselorBotId = agent.id;
      counselorName = agent.name;
    }

    // 新建会话时，异步归档上一个仍处于 ACTIVE 状态的会话
    this.archiveLastActiveSession(userId).catch(() => {});

    const session = await (this.prisma as any).counselingSession.create({
      data: {
        userId,
        roomId: data.roomId || null,
        roomTitle: data.roomTitle || null,
        sentimentRecordId: data.sentimentRecordId || null,
        counselorBotId,
        counselorName,
        status: 'ACTIVE',
        title: '新的对话',
      },
    });

    this.achievementsService
      ?.checkCounselingAchievements(userId)
      .catch(() => {});

    // 同步写入首条开场白，避免前端长时间空消息 + 骨架屏；RAG/Coze 个性化在后台再更新同一条
    const immediateOpening =
      data.roomId && data.roomTitle
        ? `我看到你刚经历了一场关于「${data.roomTitle}」的辩论，现在感觉怎么样？有什么想聊的吗？`
        : '你好！很高兴见到你。今天有什么想聊的吗？无论什么都可以说说。';

    const openingRow = await (this.prisma as any).counselingMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: immediateOpening,
      },
    });

    if (!data.roomId || !data.roomTitle) {
      this.maybePersonalizeOpeningFromMemory(
        session.id,
        userId,
        openingRow.id,
      ).catch(() => {});
    }

    return {
      id: session.id,
      title: session.title || '新的对话',
      summary: session.summary ?? undefined,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      roomId: session.roomId ?? undefined,
      roomTitle: session.roomTitle ?? undefined,
      sentimentRecordId: session.sentimentRecordId ?? undefined,
      counselorBotId: session.counselorBotId,
      counselorName: session.counselorName || DEFAULT_COUNSELOR_NAME,
      messageCount: 1,
      messages: [
        {
          id: openingRow.id,
          sessionId: session.id,
          role: openingRow.role,
          content: openingRow.content,
          createdAt: openingRow.createdAt,
        },
      ],
    };
  }

  /**
   * 归档该用户上一个 ACTIVE 会话（新建会话时触发）。
   * 只处理最近一条，避免重复归档。
   */
  private async archiveLastActiveSession(userId: number) {
    const last = await (this.prisma as any).counselingSession.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });
    if (!last) return;

    await (this.prisma as any).counselingSession.update({
      where: { id: last.id },
      data: { status: 'CLOSED' },
    });
    await this.archiveSession(last.id, userId);
  }

  /**
   * 老用户：在已有默认开场白之后，用 RAG + Coze 覆盖首条消息（较慢，走后台）。
   * 关联案件会话不会调用本方法。
   */
  private async maybePersonalizeOpeningFromMemory(
    sessionId: number,
    userId: number,
    openingMessageId: number,
  ) {
    try {
      const memories = await this.ragService.searchMemories(
        userId,
        '最近的状态',
        1,
      );
      if (memories.length === 0) return;

      const lastMemory = memories[0];
      const opening =
        (await this.cozeService.generateOpening(lastMemory)) ??
        `上次我们聊了一些事情，最近怎么样了？`;

      const count = await (this.prisma as any).counselingMessage.count({
        where: { sessionId },
      });
      if (count !== 1) return;

      const first = await (this.prisma as any).counselingMessage.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      if (
        !first ||
        first.id !== openingMessageId ||
        first.role !== 'ASSISTANT'
      ) {
        return;
      }

      await (this.prisma as any).counselingMessage.update({
        where: { id: openingMessageId },
        data: { content: opening },
      });
    } catch {
      // 保留默认欢迎语
    }
  }

  async getMessages(sessionId: number, userId: number) {
    await this.ensureOwner(sessionId, userId);
    const messages = await (this.prisma as any).counselingMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return messages;
  }

  /**
   * 预检索接口：用户打字时（防抖 300ms）调用，提前完成 RAG 检索。
   * 结果缓存在内存 Map，sendMessage 时直接读取，消除 Ollama 嵌入延迟。
   */
  async prefetchMemories(sessionId: number, userId: number, inputText: string) {
    if (!inputText.trim()) return { success: true };
    const memories = await this.ragService.searchMemories(userId, inputText, 3);
    this.prefetchCache.set(`${sessionId}`, memories);
    this.logger.log(
      `[RAG] prefetch sessionId=${sessionId} query="${inputText.slice(0, 30)}" → ${memories.length} 条记忆: ${JSON.stringify(memories)}`,
    );
    return { success: true };
  }

  async sendMessage(
    sessionId: number,
    userId: number,
    content: string,
    res: Response,
  ) {
    const session = await this.ensureOwner(sessionId, userId);

    // 读取预检索缓存（用户打字时已提前完成），用完即清
    const cachedMemories = this.prefetchCache.get(`${sessionId}`) ?? [];
    this.prefetchCache.delete(`${sessionId}`);
    this.logger.log(
      `[RAG] sendMessage sessionId=${sessionId} 缓存命中 ${cachedMemories.length} 条: ${JSON.stringify(cachedMemories)}`,
    );

    // 保存用户消息
    await (this.prisma as any).counselingMessage.create({
      data: { sessionId, role: 'USER', content },
    });

    // 第一条消息时用前 20 字更新会话标题
    const msgCount = await (this.prisma as any).counselingMessage.count({
      where: { sessionId },
    });
    if (msgCount === 1) {
      await (this.prisma as any).counselingSession.update({
        where: { id: sessionId },
        data: { title: content.slice(0, 20) },
      });
    }

    await (this.prisma as any).counselingSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // 获取历史消息（最近 20 条，控制 token 用量）
    const allMessages = await (this.prisma as any).counselingMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const history = allMessages.map((m: any) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    // 构建 system prompt（案件上下文 + RAG 历史记忆）
    const systemExtra = await this.buildSystemExtra(session, cachedMemories);

    // 使用会话绑定的辅导师，没有则回退到系统默认
    const botId = session.counselorBotId ?? DEFAULT_COUNSELOR_BOT_ID;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    let fullContent = '';

    try {
      await this.cozeService.streamCounselorChat(
        botId,
        history,
        systemExtra,
        (chunk) => {
          if (chunk.kind === 'answer') {
            fullContent += chunk.text;
            res.write(
              `data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`,
            );
          } else {
            res.write(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`);
          }
        },
        sessionId,
      );
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: '回复生成失败，请重试' })}\n\n`,
      );
      res.end();
      return;
    }

    await (this.prisma as any).counselingMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: fullContent },
    });

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    // 异步情绪风险检测，不阻塞主流程
    this.checkEmotionRisk(session.userId, sessionId, content).catch(() => {});
  }

  async closeSession(sessionId: number, userId: number) {
    await this.ensureOwner(sessionId, userId);
    await (this.prisma as any).counselingSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' },
    });

    // 异步归档：生成摘要 + 向量化存 ChromaDB，不阻塞响应
    this.archiveSession(sessionId, userId).catch((err) =>
      console.error('[counseling] 会话归档失败', err),
    );

    return { success: true };
  }

  async deleteSession(sessionId: number, userId: number) {
    await this.ensureOwner(sessionId, userId);
    await (this.prisma as any).counselingSession.delete({
      where: { id: sessionId },
    });
    return { success: true };
  }

  /** 每 5 分钟扫描一次，自动归档超过 5 分钟无消息的 ACTIVE 会话。 */
  @Cron('*/5 * * * *')
  async autoArchiveIdleSessions() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const idleSessions = await (this.prisma as any).counselingSession.findMany({
      where: { status: 'ACTIVE', updatedAt: { lt: fiveMinutesAgo } },
      select: { id: true, userId: true },
    });
    for (const s of idleSessions) {
      await (this.prisma as any).counselingSession.update({
        where: { id: s.id },
        data: { status: 'CLOSED' },
      });
      this.archiveSession(s.id, s.userId).catch(() => {});
    }
  }

  /**
   * 会话归档：关闭后异步执行，生成摘要并向量化存入 ChromaDB。
   * 摘要格式：由 Coze 将对话浓缩为一句话，如"用户因考研焦虑，倾向被倾听"。
   */
  private async archiveSession(sessionId: number, userId: number) {
    const messages = await (this.prisma as any).counselingMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length < 2) return; // 对话太短，不值得归档

    // 调 Coze 生成摘要
    const summary = await this.cozeService.summarizeSession(messages);
    if (!summary) return;

    // 写回数据库
    await (this.prisma as any).counselingSession.update({
      where: { id: sessionId },
      data: { summary },
    });

    // 向量化摘要，存入用户专属 ChromaDB 集合
    const date = new Date().toISOString().slice(0, 10);
    await this.ragService.addMemory({ userId, sessionId, summary, date });
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

  private async buildSystemExtra(
    session: any,
    cachedMemories: string[],
  ): Promise<string> {
    const parts: string[] = [];

    // 注入 RAG 检索到的历史记忆（已在用户打字时预检索完成）
    if (cachedMemories.length > 0) {
      this.logger.log(
        `[RAG] 注入 prompt，记忆内容:\n${cachedMemories.map((m, i) => `  ${i + 1}. ${m}`).join('\n')}`,
      );
      parts.push(
        '【背景参考：以下是该用户在过去几次对话中留下的核心情绪记录，由系统自动检索与本次话题相关的内容提供给你】\n' +
          cachedMemories.map((m, i) => `${i + 1}. ${m}`).join('\n') +
          '\n\n【使用指引】\n' +
          '- 这些是用户真实经历过的事，不是假设；回复时可以自然地提及，例如"你之前提到……""上次你说……"\n' +
          '- 如果当前话题与某条记录有关联，主动把两者联系起来，帮助用户看到情绪的连贯性\n' +
          '- 不要一次性列举所有记忆，选最相关的 1-2 条自然融入即可\n' +
          '- 语气要温暖自然，像一个真正记得用户的朋友，而不是在读档案',
      );
    } else {
      this.logger.log(`[RAG] 无记忆注入 sessionId=${session.id}（缓存为空）`);
    }

    // 注入关联案件上下文
    if (session.roomId) {
      try {
        const room = await this.prisma.room.findUnique({
          where: { id: session.roomId },
          select: { title: true, content: true },
        });
        if (room) {
          parts.push(
            `【用户关联的困境案件】\n案件标题：${room.title}\n案件描述：${room.content}\n请结合以上背景给予针对性疏导，无需用户重复描述背景。`,
          );
        }
      } catch {
        // 查询失败静默忽略
      }
    }

    return parts.join('\n\n');
  }

  private async checkEmotionRisk(
    userId: number,
    sessionId: number,
    text: string,
  ) {
    const HIGH_KEYWORDS = [
      '不想活',
      '撑不下去',
      '结束一切',
      '活着没意思',
      '去死',
      '自杀',
      '想死',
    ];
    const hitKeyword = HIGH_KEYWORDS.some((kw) => text.includes(kw));

    let riskLevel: string | null = null;
    let summary = text.slice(0, 50);

    if (hitKeyword) {
      riskLevel = 'HIGH';
    } else {
      const result = await this.cozeService.analyzeSentiment(text);
      if (!result || result.riskLevel === 'NONE') return;
      riskLevel = result.riskLevel;
      summary = result.summary || text.slice(0, 50);
    }

    // 同一会话同等级未处理预警不重复触发
    const exists = await (this.prisma as any).emotionAlert.findFirst({
      where: { sessionId, riskLevel, isHandled: false },
    });
    if (exists) return;

    await (this.prisma as any).emotionAlert.create({
      data: { userId, sessionId, riskLevel, summary },
    });

    // 推送通知给所有管理员
    const admins = await (this.prisma as any).user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin: { id: number }) =>
        (this.prisma as any).notification.create({
          data: {
            userId: admin.id,
            type: riskLevel === 'HIGH' ? 'ALERT_HIGH' : 'ALERT_MEDIUM',
            fromUserId: userId,
            roomId: null,
          },
        }),
      ),
    );
  }
}
