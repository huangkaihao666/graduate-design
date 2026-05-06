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

  /**
   * 与 `/counseling` 默认情绪伙伴一致的平台兜底知识库（Coze dataset_id 列表）。
   * 对应环境变量 `COZE_DEFAULT_DATASET_IDS`（逗号分隔）；自建智能体创建/解绑后会始终尝试保留。
   */
  private getCounselingFallbackDatasetIds(): string[] {
    const raw = (process.env.COZE_DEFAULT_DATASET_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return raw;
  }

  /** 默认情绪伙伴 dataset + 用户自建知识库 dataset（去重）；用于 Coze Bot 挂载 */
  private mergeBotDatasetIds(userCozeDatasetId?: string | null): string[] {
    const base = [...this.getCounselingFallbackDatasetIds()];
    const extra = userCozeDatasetId?.trim();
    if (!extra) return base;
    const seen = new Set(base);
    if (!seen.has(extra)) base.push(extra);
    return base;
  }

  /** 从 Coze 报错文案中解析无效的 dataset_id（如 code 4200） */
  private extractInvalidDatasetIdFromCozeMessage(
    message: string,
  ): string | null {
    const m = message.match(/dataset_id[=](\d+)/i);
    return m?.[1] ?? null;
  }

  /**
   * 写入 Bot 挂载的知识库列表；若遇「dataset 不存在」(4200) 则剔除报错 ID 后重试（多为 COZE_DEFAULT_DATASET_IDS 过期）。
   */
  private async pushKnowledgeDatasetsToCozeWithStaleFallback(params: {
    botId: string;
    mergedDatasetIds: string[];
    /** 用户自建库对应的 Coze dataset_id，若为报错 ID 则说明用户这条库失效，不重试兜底 */
    userCozeDatasetId?: string;
  }): Promise<void> {
    const { botId, userCozeDatasetId } = params;
    let ids = [...params.mergedDatasetIds];
    const maxStrips = Math.max(ids.length + 3, 8);
    let stripCount = 0;

    for (;;) {
      try {
        await this.cozeService.updateBot({
          botId,
          knowledgeDatasetIds: ids,
        });
        await this.cozeService.publishBot(botId);
        if (stripCount > 0) {
          this.logger.warn(
            `[syncCozeKnowledge] Bot ${botId} 在剔除无效 dataset 后已发布，剩余 dataset_ids=${ids.join(',') || '(无挂载)'}`,
          );
        }
        return;
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        const badId = this.extractInvalidDatasetIdFromCozeMessage(raw);
        const looksLikeStaleDataset =
          raw.includes('4200') ||
          /\bdoes\s+not\s+exist\b/i.test(raw) ||
          (raw.includes('dataset_id') && raw.includes('resource'));

        if (
          userCozeDatasetId &&
          badId &&
          badId === userCozeDatasetId.trim() &&
          ids.includes(badId)
        ) {
          throw new BadRequestException(
            `当前绑定的自建知识库在 Coze 上不存在或无权限（dataset_id=${badId}）。请确认 COZE_SPACE_ID、COZE_API_KEY 与创建该知识库时一致；或删除本地该知识库后重新「新建知识库」再绑定。`,
          );
        }

        if (
          !badId ||
          !ids.includes(badId) ||
          !looksLikeStaleDataset ||
          stripCount >= maxStrips
        ) {
          throw err;
        }

        this.logger.warn(
          `[syncCozeKnowledge] Bot ${botId}: Coze 拒绝 dataset_id=${badId}，将从挂载列表移除并重试（请检查 .env 中 COZE_DEFAULT_DATASET_IDS 是否仍有效）`,
        );
        ids = ids.filter((x) => x !== badId);
        stripCount += 1;

        if (ids.length === 0) {
          await this.cozeService.updateBot({
            botId,
            knowledgeDatasetIds: [],
          });
          await this.cozeService.publishBot(botId);
          this.logger.warn(
            `[syncCozeKnowledge] Bot ${botId}: 全部 dataset 均无效已清空挂载`,
          );
          return;
        }
      }
    }
  }

  /**
   * 按本地 Agent 记录的 knowledgeBaseId（含 null）合并平台默认 dataset，写入 Coze 并 publish。
   * 入库后应立即调用一次；管理员通过「智能体 / 文档」审核后也需调用（与是否在 counseling 中选它无关）。
   *
   * @param opts.throwOnError 为 true 时（绑定/解绑等用户操作）将 Coze API 报错抛回接口，避免出现「控制台无知识库但该接口仍 200」的假象。
   */
  async syncCozeBotKnowledgeFromDb(
    botId: string,
    opts?: { throwOnError?: boolean },
  ): Promise<void> {
    const throwOnError = opts?.throwOnError ?? false;

    try {
      const agent = await this.prisma.agent.findUnique({
        where: { id: botId },
        select: { knowledgeBaseId: true },
      });
      if (!agent) {
        this.logger.warn(`[syncCozeKnowledge] Agent ${botId} 不存在，跳过`);
        if (throwOnError) {
          throw new BadRequestException('智能体不存在');
        }
        return;
      }

      let userCozeKb: string | undefined;
      if (agent.knowledgeBaseId != null) {
        const kb = await this.prisma.knowledgeBase.findUnique({
          where: { id: agent.knowledgeBaseId },
          select: { cozeKbId: true },
        });
        const kid = kb?.cozeKbId?.trim();
        if (!kid) {
          const msg = `绑定知识库 #${agent.knowledgeBaseId} 缺少有效的 Coze 知识库标识（cozeKbId）`;
          this.logger.warn(`[syncCozeKnowledge] Bot ${botId}: ${msg}`);
          if (throwOnError) {
            throw new BadRequestException(
              `${msg}。请先在「私有知识库」列表确认已在 Coze 创建成功后再绑定；必要时删除并重建知识库。`,
            );
          }
        } else {
          userCozeKb = kid;
        }
      }

      const merged = this.mergeBotDatasetIds(userCozeKb ?? null);

      await this.pushKnowledgeDatasetsToCozeWithStaleFallback({
        botId,
        mergedDatasetIds: merged,
        userCozeDatasetId: userCozeKb,
      });
      this.logger.log(
        `[syncCozeKnowledge] Bot ${botId} 已完成发布（请求 datasets=${merged.length}）`,
      );
    } catch (err: unknown) {
      const msgPart =
        err instanceof Error ? err.message : typeof err === 'string' ? err : '';
      if (throwOnError) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.error(`[syncCozeKnowledge] Bot ${botId} 抛出: ${msgPart}`);
        throw new BadRequestException(
          msgPart
            ? `同步知识库到 Coze 失败：${msgPart}`
            : '同步知识库到 Coze 失败：未知错误',
        );
      }
      if (err instanceof BadRequestException) {
        this.logger.warn(`[syncCozeKnowledge] Bot ${botId}: ${err.message}`);
        return;
      }
      this.logger.warn(
        `[syncCozeKnowledge] Bot ${botId}: ${msgPart || 'unknown error'}`,
      );
    }
  }

  /** 知识文档审核通过后，刷新绑定该知识库的自建 Agent，使 Coze 侧可见新入库文档 */
  async syncCozeBotKnowledgeForAgentsBoundToKb(kbId: number): Promise<void> {
    const agents = await this.prisma.agent.findMany({
      where: { knowledgeBaseId: kbId, isSystem: false },
      select: { id: true },
    });
    for (const { id } of agents) {
      await this.syncCozeBotKnowledgeFromDb(id);
    }
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

    let knowledgeBaseId: number | undefined;
    if (
      dto.knowledgeBaseId != null &&
      Number.isFinite(Number(dto.knowledgeBaseId))
    ) {
      const kb = await this.prisma.knowledgeBase.findUnique({
        where: { id: dto.knowledgeBaseId },
      });
      if (!kb || kb.userId !== userId) {
        throw new ForbiddenException('无权使用该知识库');
      }
      knowledgeBaseId = kb.id;
    }

    // 1. 在 Coze 创建草稿 Bot（不在此步挂 knowledge，避免与「入库后 snapshot」不一致）
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

    // 2. 写入本地数据库
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
        knowledgeBaseId: knowledgeBaseId ?? null,
        winRate: 0.5,
        participateCount: 0,
        fans: 0,
      },
    });

    await this.syncCozeBotKnowledgeFromDb(cozeBotId, {
      throwOnError: knowledgeBaseId != null,
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

  async deleteKnowledgeBase(kbId: number, userId: number) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
      include: { documents: true },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    if (kb.userId !== userId) throw new ForbiddenException('无权操作此知识库');

    // 1. 解绑本地绑定关系，再按 DB 快照重新同步 Coze（仅剩平台默认 dataset）
    const boundAgents = await this.prisma.agent.findMany({
      where: { knowledgeBaseId: kbId },
      select: { id: true },
    });
    await this.prisma.agent.updateMany({
      where: { knowledgeBaseId: kbId },
      data: { knowledgeBaseId: null },
    });
    for (const { id } of boundAgents) {
      await this.syncCozeBotKnowledgeFromDb(id);
    }

    // 2. 删除 Coze 上的知识库（非阻塞）
    this.cozeService.deleteKnowledgeBase(kb.cozeKbId).catch(() => {});

    // 3. 删除本地记录（cascade 会自动删除 documents）
    await this.prisma.knowledgeBase.delete({ where: { id: kbId } });
    return { success: true };
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

    // 存 base64 内容供管理端预览，状态 PENDING 等待审核，暂不上传 Coze
    const contentBase64 = buffer.toString('base64');

    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        kbId,
        filename,
        mimeType,
        size: buffer.length,
        status: 'PENDING',
        content: contentBase64,
        cozeDocId: null,
      },
    });
    this.achievementsService
      ?.checkKnowledgeAchievements(userId)
      .catch(() => {});
    return { ...doc, content: undefined }; // 不把 base64 返回给前端
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

    if (doc.cozeDocId) {
      try {
        await this.cozeService.deleteDocument(kb.cozeKbId, doc.cozeDocId);
      } catch (err: any) {
        this.logger.warn(
          `Coze deleteDocument failed (non-fatal): ${err?.message}`,
        );
      }
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

    const updated = await this.prisma.agent.update({
      where: { id: agentId },
      data: { knowledgeBaseId: kbId },
    });
    await this.syncCozeBotKnowledgeFromDb(agentId, { throwOnError: true });
    return updated;
  }

  /** 解绑用户自建知识库；保留平台默认「AI 情绪伙伴」知识库 dataset */
  async unbindKnowledgeBase(agentId: string, userId: number) {
    await this.ensureOwner(agentId, userId);

    const updated = await this.prisma.agent.update({
      where: { id: agentId },
      data: { knowledgeBaseId: null },
    });
    await this.syncCozeBotKnowledgeFromDb(agentId, { throwOnError: true });
    return updated;
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
