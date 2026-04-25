import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CozeService } from '../rooms/coze.service';
import { AchievementsService } from '@/modules/achievements/achievements.service';
import { CreateCustomAgentDto } from './dto/create-agent.dto';
import { UpdateCustomAgentDto } from './dto/update-agent.dto';

@Injectable()
export class CustomAgentsService {
  private readonly logger = new Logger(CustomAgentsService.name);

  /** 运行时缓存：首次成功获取后不再重复请求 */
  private cachedSpaceId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cozeService: CozeService,
    @Optional() private readonly achievementsService?: AchievementsService,
  ) {}

  // ─── 工作空间 ────────────────────────────────────────────────

  async getWorkspaces() {
    return this.cozeService.getWorkspaces();
  }

  /**
   * 获取 space_id：优先读 env，其次自动取工作空间列表第一个
   */
  private async resolveSpaceId(): Promise<string> {
    if (process.env.COZE_SPACE_ID?.trim()) {
      return process.env.COZE_SPACE_ID.trim();
    }
    if (this.cachedSpaceId) return this.cachedSpaceId;

    const workspaces = await this.cozeService.getWorkspaces();
    if (!workspaces.length) {
      throw new BadRequestException(
        'COZE_SPACE_ID 未配置，且无法从 Coze 获取工作空间列表。请在 .env 中设置 COZE_SPACE_ID。',
      );
    }
    // 优先选个人空间（workspace_type=personal），否则取第一个
    const personal = workspaces.find((w) => w.workspace_type === 'personal');
    this.cachedSpaceId = (personal || workspaces[0]).id;
    this.logger.log(`Auto-resolved COZE_SPACE_ID: ${this.cachedSpaceId}`);
    return this.cachedSpaceId;
  }

  // ─── 我的智能体列表 ──────────────────────────────────────────

  async getMyAgents(userId: number) {
    const agents = await this.prisma.agent.findMany({
      where: { creatorId: userId, isSystem: false },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
      },
    });

    return agents.map((a) => ({
      ...a,
      domainsArr: a.domains
        ? (a.domains as string).split(',').filter(Boolean)
        : [],
    }));
  }

  // ─── 公开的用户自建智能体（AI 图鉴展示） ────────────────────

  async getPublicCustomAgents(params: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { search, page = 1, pageSize = 20 } = params;
    const where: any = {
      isSystem: false,
      isPublic: true,
      status: 'APPROVED',
    };
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { personality: { contains: search.trim() } },
        { description: { contains: search.trim() } },
      ];
    }

    const [total, agents] = await Promise.all([
      this.prisma.agent.count({ where }),
      this.prisma.agent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
        },
      }),
    ]);

    return {
      data: agents.map((a) => ({
        ...a,
        domainsArr: a.domains
          ? (a.domains as string).split(',').filter(Boolean)
          : [],
      })),
      pagination: { total, page, pageSize },
    };
  }

  // ─── 创建智能体 ──────────────────────────────────────────────

  async createAgent(userId: number, dto: CreateCustomAgentDto) {
    const spaceId = await this.resolveSpaceId();

    // 1. 在 Coze 创建 Bot（草稿态）
    let cozeBotId: string;
    try {
      cozeBotId = await this.cozeService.createBot({
        spaceId,
        name: dto.name,
        description: dto.description,
        prompt: dto.prompt,
        onboardingPrologue: `你好，我是 ${dto.name}，很高兴为你服务！`,
      });
    } catch (err: any) {
      this.logger.error(`Coze createBot failed: ${err?.message}`);
      throw new BadRequestException(
        `Coze Bot 创建失败：${err?.message || '未知错误'}`,
      );
    }

    // 2. 发布到 API 渠道（connector_id=1024），让 bot 可通过 /v3/chat 调用
    try {
      await this.cozeService.publishBot(cozeBotId);
    } catch (err: any) {
      // 发布失败不阻断创建流程，只记录警告
      this.logger.warn(`Coze publishBot failed (non-fatal): ${err?.message}`);
    }

    // 3. 写入本地数据库
    const status = dto.isPublic ? 'PENDING' : 'PRIVATE';
    const agent = await this.prisma.agent.create({
      data: {
        id: cozeBotId,
        name: dto.name,
        personality: dto.personality || '',
        description: dto.description || '',
        prompt: dto.prompt,
        avatar: dto.avatar || null,
        domains: dto.domains || null,
        isSystem: false,
        isPublic: dto.isPublic ?? false,
        status,
        creatorId: userId,
        winRate: 0.5,
        participateCount: 0,
        fans: 0,
      },
    });

    this.achievementsService?.checkAgentAchievements(userId).catch(() => {});
    return agent;
  }

  // ─── 编辑智能体 ──────────────────────────────────────────────

  async updateAgent(
    agentId: string,
    userId: number,
    dto: UpdateCustomAgentDto,
  ) {
    await this.ensureOwner(agentId, userId);

    // 同步更新 Coze Bot，更新后重新发布
    if (dto.name || dto.description !== undefined || dto.prompt) {
      try {
        await this.cozeService.updateBot({
          botId: agentId,
          name: dto.name,
          description: dto.description,
          prompt: dto.prompt,
        });
        await this.cozeService.publishBot(agentId);
      } catch (err: any) {
        this.logger.warn(
          `Coze update/publish failed (non-fatal): ${err?.message}`,
        );
      }
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.personality !== undefined && { personality: dto.personality }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.prompt && { prompt: dto.prompt }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.domains !== undefined && { domains: dto.domains }),
      },
    });
  }

  // ─── 删除智能体 ──────────────────────────────────────────────

  async deleteAgent(agentId: string, userId: number) {
    await this.ensureOwner(agentId, userId);
    await this.prisma.agent.delete({ where: { id: agentId } });
    return { success: true };
  }

  // ─── 申请公开（提交审核） ────────────────────────────────────

  async publishAgent(agentId: string, userId: number) {
    const agent = await this.ensureOwner(agentId, userId);
    if (agent.status === 'APPROVED' && agent.isPublic) {
      throw new BadRequestException('该智能体已经公开');
    }
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { isPublic: true, status: 'PENDING' },
    });
  }

  // ─── 手动重新发布到 Coze API 渠道 ───────────────────────────

  async cozePublishBot(agentId: string, userId: number) {
    await this.ensureOwner(agentId, userId);
    try {
      await this.cozeService.publishBot(agentId);
    } catch (err: any) {
      throw new BadRequestException(`Coze 发布失败：${err?.message}`);
    }
    return { success: true, message: 'Bot 已发布到 Coze API 渠道' };
  }

  // ─── 知识库管理 ──────────────────────────────────────────────

  async createKnowledgeBase(
    userId: number,
    name: string,
    description?: string,
  ) {
    const spaceId = await this.resolveSpaceId();

    let cozeKbId: string;
    try {
      cozeKbId = await this.cozeService.createKnowledgeBase({
        spaceId,
        name,
        description,
      });
    } catch (err: any) {
      throw new BadRequestException(`知识库创建失败：${err?.message}`);
    }

    return this.prisma.knowledgeBase.create({
      data: { userId, name, cozeKbId, description },
    });
  }

  async getMyKnowledgeBases(userId: number) {
    return this.prisma.knowledgeBase.findMany({
      where: { userId },
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(
    kbId: number,
    userId: number,
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    if (kb.userId !== userId) throw new ForbiddenException('无权操作此知识库');

    let cozeDocId: string;
    try {
      cozeDocId = await this.cozeService.uploadDocument({
        datasetId: kb.cozeKbId,
        filename,
        buffer,
        mimeType,
      });
    } catch (err: any) {
      throw new BadRequestException(`文档上传失败：${err?.message}`);
    }

    const doc = await this.prisma.knowledgeDocument.create({
      data: { kbId, filename, cozeDocId, size: buffer.length },
    });
    this.achievementsService
      ?.checkKnowledgeAchievements(userId)
      .catch(() => {});
    return doc;
  }

  async deleteDocument(kbId: number, docId: number, userId: number) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    if (kb.userId !== userId) throw new ForbiddenException('无权操作此知识库');

    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.kbId !== kbId) throw new NotFoundException('文档不存在');

    try {
      await this.cozeService.deleteDocument(kb.cozeKbId, doc.cozeDocId);
    } catch (err: any) {
      this.logger.warn(
        `Coze deleteDocument failed (non-fatal): ${err?.message}`,
      );
    }

    await this.prisma.knowledgeDocument.delete({ where: { id: docId } });
    return { success: true };
  }

  /** 从 Coze 平台同步文档列表（用于校验本地记录） */
  async syncDocumentsFromCoze(kbId: number, userId: number) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    if (kb.userId !== userId) throw new ForbiddenException('无权操作此知识库');

    try {
      return await this.cozeService.listDocuments(kb.cozeKbId);
    } catch (err: any) {
      throw new BadRequestException(`同步失败：${err?.message}`);
    }
  }

  // ─── 绑定知识库到智能体 ──────────────────────────────────────

  async bindKnowledgeBase(agentId: string, kbId: number, userId: number) {
    await this.ensureOwner(agentId, userId);
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
    });
    if (!kb || kb.userId !== userId)
      throw new ForbiddenException('无权操作此知识库');

    // 同步绑定到 Coze Bot，并重新发布
    try {
      await this.cozeService.updateBot({
        botId: agentId,
        knowledgeDatasetIds: [kb.cozeKbId],
      });
      await this.cozeService.publishBot(agentId);
      this.logger.log(
        `Bot ${agentId} bound to KB ${kb.cozeKbId} and republished`,
      );
    } catch (err: any) {
      this.logger.warn(`Coze bind KB failed (non-fatal): ${err?.message}`);
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: { knowledgeBaseId: kbId },
    });
  }

  /** 解绑知识库 */
  async unbindKnowledgeBase(agentId: string, userId: number) {
    await this.ensureOwner(agentId, userId);

    try {
      await this.cozeService.updateBot({
        botId: agentId,
        knowledgeDatasetIds: [],
      });
      await this.cozeService.publishBot(agentId);
    } catch (err: any) {
      this.logger.warn(`Coze unbind KB failed (non-fatal): ${err?.message}`);
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: { knowledgeBaseId: null },
    });
  }

  // ─── 内部辅助 ────────────────────────────────────────────────

  private async ensureOwner(agentId: string, userId: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFoundException('智能体不存在');
    if (agent.creatorId !== userId)
      throw new ForbiddenException('无权操作此智能体');
    return agent;
  }
}
