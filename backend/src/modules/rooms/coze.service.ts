import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Coze API 集成服务（真实调用版）
 */
@Injectable()
export class CozeService {
  private readonly logger = new Logger(CozeService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  constructor() {
    const key = process.env.COZE_API_KEY?.trim();
    if (!key) {
      throw new Error(
        'COZE_API_KEY is not set. Add it to backend/.env (see README).',
      );
    }
    this.apiKey = key;

    this.client = axios.create({
      baseURL: 'https://api.coze.cn/v3',
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 调用 Coze AI Agent 获取流式响应
   * @param botId Coze bot_id（即 Agent ID）
   * @param prompt 构造好的 prompt
   * @param onChunk 每收到一小段文本时的回调（区分思考/最终回答）
   */
  async streamChat(
    botId: string,
    prompt: string,
    onChunk: (chunk: { kind: 'reasoning' | 'answer'; text: string }) => void,
    options?: {
      /** 与 Coze 侧会话绑定；辩论场景必须按房间隔离，避免多房间共用同一上下文 */
      userId?: string;
      /**
       * 辩论每轮 prompt 已含完整案件与发言，切勿与历史合并，否则易串线或触发错误工作流。
       * 默认 false：无状态单次任务。
       */
      autoSaveHistory?: boolean;
    },
  ): Promise<void> {
    const userId =
      options?.userId ??
      `coze_once_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const autoSaveHistory = options?.autoSaveHistory ?? false;

    // 打印本次调用概要和 Prompt 片段，方便调试
    const preview = prompt.length > 200 ? `${prompt.slice(0, 200)}...` : prompt;
    this.logger.log(
      `🛰️ Calling Coze API for bot ${botId} (user_id=${userId}, auto_save_history=${autoSaveHistory}). Prompt preview: ${preview}`,
    );

    try {
      const response = await this.client.post(
        '/chat',
        {
          bot_id: botId,
          user_id: userId,
          stream: true,
          auto_save_history: autoSaveHistory,
          additional_messages: [
            {
              role: 'user',
              content: prompt,
              content_type: 'text',
            },
          ],
        },
        {
          responseType: 'stream',
        },
      );

      const stream = response.data as NodeJS.ReadableStream;
      let buffer = '';
      let chunkCount = 0;
      const hasAnswerDeltaByMsgId = new Map<string, boolean>();

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().startsWith('data:')) {
              try {
                const payload = JSON.parse(line.trim().slice(5).trim());
                if (payload?.status === 'failed') {
                  const errMsg = payload?.last_error?.msg || 'Coze 对话失败';
                  const errCode = payload?.last_error?.code;
                  reject(
                    new Error(
                      errCode === 4013 ? '请求过于频繁，请稍后再试' : errMsg,
                    ),
                  );
                  return;
                }
              } catch {
                /* ignore */
              }
            }
          }

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.slice(5).trim();
            try {
              const payload = JSON.parse(jsonStr);
              const msgType = String(payload?.type || '');
              // 跳过典型噪声；follow_up 多为追问引导，混入会污染辩论正文入库
              if (msgType === 'verbose' || msgType === 'follow_up') {
                continue;
              }

              const msgId = String(payload?.id || '');

              // 1) 思考过程：reasoning_content（通常是逐字 delta）
              if (
                typeof payload?.reasoning_content === 'string' &&
                payload.reasoning_content
              ) {
                onChunk({ kind: 'reasoning', text: payload.reasoning_content });
                chunkCount += 1;
              }

              // 2) 最终回答：content
              if (typeof payload?.content === 'string' && payload.content) {
                const isCompletedPayload =
                  !!payload?.created_at || !!payload?.time_cost;
                const hasDelta = msgId
                  ? (hasAnswerDeltaByMsgId.get(msgId) ?? false)
                  : false;

                if (!isCompletedPayload) {
                  // delta：直接增量追加
                  onChunk({ kind: 'answer', text: payload.content });
                  if (msgId) hasAnswerDeltaByMsgId.set(msgId, true);
                  chunkCount += 1;
                } else if (!hasDelta) {
                  // completed：只有在此前没有 delta 的情况下才补发完整内容，避免重复
                  onChunk({ kind: 'answer', text: payload.content });
                  chunkCount += 1;
                }
              }
            } catch {
              // 非 JSON 行，忽略
            }
          }
        });

        stream.on('end', () => {
          if (buffer.trim()) {
            const tail = buffer;
            buffer = '';
            for (const line of tail.split('\n')) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              try {
                const payload = JSON.parse(jsonStr);
                const msgType = String(payload?.type || '');
                if (msgType === 'verbose' || msgType === 'follow_up') continue;
                const msgId = String(payload?.id || '');
                if (
                  typeof payload?.reasoning_content === 'string' &&
                  payload.reasoning_content
                ) {
                  onChunk({
                    kind: 'reasoning',
                    text: payload.reasoning_content,
                  });
                  chunkCount += 1;
                }
                if (typeof payload?.content === 'string' && payload.content) {
                  const isCompletedPayload =
                    !!payload?.created_at || !!payload?.time_cost;
                  const hasDelta = msgId
                    ? (hasAnswerDeltaByMsgId.get(msgId) ?? false)
                    : false;
                  if (!isCompletedPayload) {
                    onChunk({ kind: 'answer', text: payload.content });
                    if (msgId) hasAnswerDeltaByMsgId.set(msgId, true);
                    chunkCount += 1;
                  } else if (!hasDelta) {
                    onChunk({ kind: 'answer', text: payload.content });
                    chunkCount += 1;
                  }
                }
              } catch {
                /* ignore */
              }
            }
          }
          this.logger.log(
            `✅ Finished streaming for bot ${botId}. Total chunks: ${chunkCount}`,
          );
          resolve();
        });

        stream.on('error', (err) => {
          this.logger.error(
            `Coze stream error for bot ${botId}: ${err.message}`,
          );
          reject(err);
        });
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to call Coze API for bot ${botId}: ${error?.message || error}`,
      );
      throw error;
    }
  }

  /**
   * 共情师多轮对话流式接口
   * 支持携带历史消息，每个 chunk 通过 onChunk 回调返回
   */
  async streamCounselorChat(
    botId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPromptExtra: string,
    onChunk: (chunk: { kind: 'thinking' | 'answer'; text: string }) => void,
    sessionId?: number,
  ): Promise<void> {
    this.logger.log(
      `💚 Counselor chat: bot=${botId}, history=${history.length} msgs`,
    );

    // 把系统级补充 prompt 拼到最后一条 user 消息前（Coze 不支持 system role，用 user 消息模拟）
    // 注入到最后一条而非第一条，确保 RAG 记忆紧贴当前消息，模型生成回复时能直接参考
    const lastUserIdx = history.map((m) => m.role).lastIndexOf('user');
    const messages = history.map((m, i) => ({
      role: m.role,
      content:
        i === lastUserIdx && systemPromptExtra
          ? `${systemPromptExtra}\n\n用户当前消息：${m.content}`
          : m.content,
      content_type: 'text',
    }));

    try {
      const response = await this.client.post(
        '/chat',
        {
          bot_id: botId,
          user_id: sessionId
            ? `session_${sessionId}`
            : `counselor_${Date.now()}`,
          stream: true,
          auto_save_history: false,
          additional_messages: messages,
        },
        { responseType: 'stream' },
      );

      const stream = response.data as NodeJS.ReadableStream;
      let buffer = '';
      const hasAnswerDeltaByMsgId = new Map<string, boolean>();

      const processLines = (lines: string[]) => {
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          try {
            const payload = JSON.parse(jsonStr);
            const msgType = String(payload?.type || '');
            if (msgType && msgType !== 'answer') continue;

            const msgId = String(payload?.id || '');
            // 思考过程（reasoning_content）
            if (
              typeof payload?.reasoning_content === 'string' &&
              payload.reasoning_content
            ) {
              onChunk({ kind: 'thinking', text: payload.reasoning_content });
            }

            // 正式回答（content）
            if (typeof payload?.content === 'string' && payload.content) {
              const isCompleted = !!payload?.created_at || !!payload?.time_cost;
              const hasDelta = msgId
                ? (hasAnswerDeltaByMsgId.get(msgId) ?? false)
                : false;
              if (!isCompleted) {
                onChunk({ kind: 'answer', text: payload.content });
                if (msgId) hasAnswerDeltaByMsgId.set(msgId, true);
              } else if (!hasDelta) {
                onChunk({ kind: 'answer', text: payload.content });
              }
            }
          } catch {
            /* ignore */
          }
        }
      };

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          // 检查 chat.failed 事件，提取错误信息并 reject
          for (const line of lines) {
            if (line.trim().startsWith('data:')) {
              try {
                const payload = JSON.parse(line.trim().slice(5).trim());
                if (payload?.status === 'failed') {
                  const errMsg = payload?.last_error?.msg || 'Coze 对话失败';
                  const errCode = payload?.last_error?.code;
                  reject(
                    new Error(
                      errCode === 4013 ? '请求过于频繁，请稍后再试' : errMsg,
                    ),
                  );
                  return;
                }
              } catch {
                /* ignore */
              }
            }
          }

          processLines(lines);
        });
        stream.on('end', () => {
          // 处理流结束时 buffer 中可能残留的最后一行
          if (buffer.trim()) {
            processLines([buffer]);
            buffer = '';
          }
          resolve();
        });
        stream.on('error', reject);
      });
    } catch (error: any) {
      this.logger.error(`Counselor stream error: ${error?.message}`);
      throw error;
    }
  }

  // ─── Coze v1 管理 API ────────────────────────────────────────

  /** 构建 v1 axios 客户端（每次按需创建，避免 getter 开销） */
  private makeV1Client(): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.coze.cn/v1',
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /** 构建 open_api axios 客户端（知识库文档旧版接口，需要 Agw-Js-Conv: str） */
  private makeOpenApiClient(): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.coze.cn',
      timeout: 120000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Agw-Js-Conv': 'str',
      },
    });
  }

  /**
   * 查询当前 API Key 可访问的工作空间列表
   * 返回 [{id, name, role_type, workspace_type}]
   */
  async getWorkspaces(): Promise<
    Array<{
      id: string;
      name: string;
      role_type: string;
      workspace_type: string;
      icon_url?: string;
    }>
  > {
    const res = await this.makeV1Client().get('/workspaces', {
      params: { page_num: 1, page_size: 50 },
    });
    return res.data?.data?.workspaces || res.data?.workspaces || [];
  }

  /**
   * 在 Coze 平台创建 Bot（草稿态，需调用 publishBot 才可通过 API 调用）
   */
  async createBot(params: {
    spaceId: string;
    name: string;
    description?: string;
    prompt: string;
    onboardingPrologue?: string;
    knowledgeDatasetIds?: string[];
  }): Promise<string> {
    const body: any = {
      space_id: params.spaceId,
      name: params.name,
      description: params.description || '',
      prompt_info: { prompt: params.prompt },
    };
    if (params.onboardingPrologue) {
      body.onboarding_info = { prologue: params.onboardingPrologue };
    }
    if (params.knowledgeDatasetIds?.length) {
      body.knowledge = {
        dataset_ids: params.knowledgeDatasetIds,
        auto_call: true,
        search_strategy: 1,
      };
    }
    const res = await this.makeV1Client().post('/bot/create', body);
    const botId = res.data?.data?.bot_id || res.data?.bot_id;
    if (!botId) throw new Error('Coze createBot: no bot_id returned');
    return String(botId);
  }

  /**
   * 发布 Bot 到 API 渠道（connector_id=1024），发布后才能通过 /v3/chat 调用
   */
  async publishBot(botId: string): Promise<string> {
    const res = await this.makeV1Client().post('/bot/publish', {
      bot_id: botId,
      connector_ids: ['1024'],
    });
    const publishedBotId = res.data?.data?.bot_id || botId;
    this.logger.log(`✅ Bot ${botId} published to API channel`);
    return String(publishedBotId);
  }

  /**
   * 更新 Bot（修改 prompt / 名称 / 绑定知识库）
   * 更新后需重新 publish 才生效
   */
  async updateBot(params: {
    botId: string;
    name?: string;
    description?: string;
    prompt?: string;
    knowledgeDatasetIds?: string[];
  }): Promise<void> {
    const body: any = { bot_id: params.botId };
    if (params.name) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.prompt) body.prompt_info = { prompt: params.prompt };
    if (params.knowledgeDatasetIds !== undefined) {
      body.knowledge = params.knowledgeDatasetIds.length
        ? {
            dataset_ids: params.knowledgeDatasetIds,
            auto_call: true,
            search_strategy: 1,
          }
        : { dataset_ids: [] };
    }
    await this.makeV1Client().post('/bot/update', body);
  }

  /**
   * 创建知识库（Dataset）
   * format_type: 0=文本, 1=表格, 2=图片
   */
  async createKnowledgeBase(params: {
    spaceId: string;
    name: string;
    description?: string;
  }): Promise<string> {
    const res = await this.makeV1Client().post('/datasets', {
      space_id: params.spaceId,
      name: params.name,
      description: params.description || '',
      format_type: 0,
    });
    const datasetId = res.data?.data?.dataset_id || res.data?.dataset_id;
    if (!datasetId)
      throw new Error('Coze createKnowledgeBase: no dataset_id returned');
    return String(datasetId);
  }

  /**
   * 上传文档到知识库（Base64 方式，使用旧版 open_api）
   * 支持 PDF / TXT / DOCX 等文本文档
   */
  async uploadDocument(params: {
    datasetId: string;
    filename: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<string> {
    const ext = params.filename.split('.').pop()?.toLowerCase() || 'txt';
    const fileBase64 = params.buffer.toString('base64');

    const res = await this.makeOpenApiClient().post(
      '/open_api/knowledge/document/create',
      {
        dataset_id: params.datasetId,
        document_bases: [
          {
            name: params.filename,
            source_info: {
              file_base64: fileBase64,
              file_type: ext,
            },
          },
        ],
        chunk_strategy: {
          separator: '\n\n',
          max_tokens: 800,
          remove_extra_spaces: false,
          remove_urls_emails: false,
          chunk_type: 1,
        },
      },
    );

    const docId =
      res.data?.document_infos?.[0]?.document_id ||
      res.data?.data?.document_infos?.[0]?.document_id;
    if (!docId) throw new Error('Coze uploadDocument: no document_id returned');
    return String(docId);
  }

  /**
   * 查看知识库文档列表（从 Coze 平台同步）
   */
  async listDocuments(
    datasetId: string,
    page = 0,
    size = 20,
  ): Promise<
    Array<{
      document_id: string;
      name: string;
      size: number;
      status: number;
      type: string;
      create_time: number;
    }>
  > {
    const res = await this.makeOpenApiClient().post(
      '/open_api/knowledge/document/list',
      { dataset_id: datasetId, page, size },
    );
    return res.data?.document_infos || res.data?.data?.document_infos || [];
  }

  /**
   * 删除知识库文档（旧版 open_api）
   */
  async deleteDocument(datasetId: string, documentId: string): Promise<void> {
    await this.makeOpenApiClient().post('/open_api/knowledge/document/delete', {
      dataset_id: datasetId,
      document_ids: [documentId],
    });
  }

  async deleteKnowledgeBase(datasetId: string): Promise<void> {
    await this.makeV1Client().delete(`/datasets/${datasetId}`);
  }

  /**
   * 构建 Prompt（根据上下文）
   */
  buildPrompt(
    caseInfo: {
      title: string;
      content: string;
    },
    context: Array<{ agentId: string; content: string; roundNumber?: number }>,
    agentRole: string,
    meta: {
      roundNumber: number;
      phase: 'statement' | 'rebuttal' | 'verdict';
      speakingOrderHint?: string;
      maxChars?: number;
    },
    audienceOpinions?: string[],
    previousSummary?: string,
  ): string {
    const maxChars = meta.maxChars ?? 900;

    // ── 综合总结：辩词必须排在案情之前，避免 Coze 侧知识库/工作流把长篇「背景」当成主输入而忽略后续辩词 ──
    if (meta.phase === 'verdict') {
      return this.buildVerdictPrompt(
        caseInfo,
        context,
        agentRole,
        meta.roundNumber,
        maxChars,
        audienceOpinions,
      );
    }

    // ── 角色与任务定义 ──────────────────────────────────────────────────
    const isReDabete = !!previousSummary;
    let prompt = `你是多智能体辩论系统中的「${agentRole}」，正在参与一场真实的辩论。\n`;
    if (isReDabete) {
      prompt += `⚠️ 本场是「续辩」：用户对上一轮辩论的结论不满意，希望在已有基础上深入讨论。请在发言时明确意识到这是续辩，不要从零开始重复上一场已经讲过的基本立场，而应在上一场结论的基础上推进、补充或提出新角度。\n\n`;
    }
    prompt += `本次辩论围绕以下案件展开：\n`;
    prompt += `- 标题：${caseInfo.title}\n`;
    prompt += `- 背景：${caseInfo.content}\n\n`;

    // 续辩时注入上一场综合总结（仅 Round1）
    if (isReDabete && meta.phase === 'statement') {
      prompt += `【上一场辩论的综合总结】（这是上一轮辩论中立观察者给出的结论，本场是对这个结论的续辩）：\n`;
      prompt += `${previousSummary}\n\n`;
      prompt += `请在此基础上，从你的角色视角出发，针对上述总结中你认为不够充分、或需要补充的观点，提出新的论据或更深入的分析。不要重复上一场已有的内容，聚焦于"上一场没说透"的部分。\n\n`;
    }

    // ── 当前阶段说明 ────────────────────────────────────────────────────
    if (meta.phase === 'statement') {
      prompt += `【当前阶段：Round ${meta.roundNumber} · 立场陈述】\n`;
      prompt += `你需要清晰表明自己的立场，并给出 2-3 个有力论据支撑。语言要有感染力，字数控制在 ${maxChars} 字以内。\n\n`;
    } else if (meta.phase === 'rebuttal') {
      const hasAudience = audienceOpinions && audienceOpinions.length > 0;

      prompt += `【当前阶段：Round ${meta.roundNumber} · 交叉反驳】\n`;
      if (hasAudience) {
        prompt += `本轮你需要完成两件事：\n`;
        prompt += `  ① 针对对方智能体在上一轮的发言，逐条找出逻辑漏洞或站不住脚的地方，进行有力反驳；\n`;
        prompt += `  ② 引用下方观众支持你立场的真实声音，说明民意站在你这边。\n`;
      } else {
        prompt += `本轮你需要针对对方智能体在上一轮的发言，逐条找出逻辑漏洞或站不住脚的地方，进行有力反驳。\n`;
        prompt += `注意：本轮没有观众观点数据，请只基于对方发言内容进行反驳，不要自行编造或假设观众的声音。\n`;
      }
      prompt += `字数控制在 ${maxChars} 字以内，语气可以犀利，但论据要具体。\n\n`;

      // 对方智能体上一轮的发言内容
      const agentContext = context.filter((m) => m.agentId !== 'audience');
      if (agentContext.length > 0) {
        prompt += `【对方智能体上一轮的发言】（你需要针对以下内容逐条反驳，不能泛泛而谈）：\n`;
        agentContext.forEach((msg, index) => {
          prompt += `${index + 1}. 「${msg.agentId}」说：${msg.content}\n`;
        });
        prompt += `\n`;
      }

      // 全量有效用户观点（已过滤灌水，立场由智能体自行判断）
      if (hasAudience) {
        prompt += `【观众的真实声音】（以下是真实用户的发言，系统已过滤无关灌水，立场未预先标注；请你自行判断每条观点的倾向：支持你的可引用 1-2 条增强说服力，支持对方的可主动接住并反驳，体现你在认真回应民意；不要照抄原文，改写融入即可）：\n`;
        audienceOpinions!.forEach((opinion, index) => {
          prompt += `${index + 1}. "${opinion}"\n`;
        });
        prompt += `\n`;
      }
    }

    return prompt;
  }

  /** Round3：材料顺序对工作流/KB 展示敏感；辩词与观众优先，案情后置并可截断。 */
  private buildVerdictPrompt(
    caseInfo: { title: string; content: string },
    context: Array<{ agentId: string; content: string; roundNumber?: number }>,
    agentRole: string,
    roundNumber: number,
    maxChars: number,
    audienceOpinions?: string[],
  ): string {
    const hasAudience = !!audienceOpinions?.length;
    const caseMaxChars = 12_000;
    const rawCase = caseInfo.content ?? '';
    const caseBody =
      rawCase.length > caseMaxChars
        ? `${rawCase.slice(0, caseMaxChars)}\n\n（案情背景过长已截断；写总结时以前面【前两轮辩论记录】编号发言为主。）`
        : rawCase;

    const agentContext = context.filter(
      (m) => m.agentId !== 'audience' && (m.roundNumber ?? 99) <= 2,
    );

    let prompt = `你是多智能体辩论系统中的「${agentRole}」。\n\n`;
    prompt +=
      `【平台说明】本条为辩论系统单次下发的完整任务单。若客户端还展示了「引用知识库/引用资料」等块，那是检索 UI，不能替代下方【前两轮辩论记录】。` +
      `案情里的法条是「辩题材料」，不是「辩词」；只要【前两轮辩论记录】下列出了带编号的发言正文，就必须基于其写满综合总结，禁止以「只有法条、没有辩论记录」「输入不完整」为由拒答。\n\n`;

    prompt += `【当前阶段：Round ${roundNumber} · 综合总结】\n`;
    prompt += `你是本场辩论的中立观察者，需要综合以下信息给出客观的综合总结：\n`;
    prompt += `  ① 用各自的名字称呼前两位 AI，归纳他们在前两轮的核心观点与局限，不要用"A方""B方"代替；\n`;
    if (hasAudience) {
      prompt += `  ② 结合下方观众的真实民意分布（支持哪方人数更多、代表性观点是什么）；\n`;
      prompt += `  ③ 给出你的综合建议，帮助用户看清问题全貌，语言贴近大学生。\n`;
    } else {
      prompt += `  ② 本场没有观众民意数据，请只基于双方辩论内容给出综合总结，不要自行编造观众声音或假设民意倾向。\n`;
    }
    prompt += `字数控制在 ${maxChars} 字以内，语言平和客观，说人话，避免官话套话。\n\n`;

    if (agentContext.length > 0) {
      prompt += `【前两轮辩论记录】（以下编号内容即双方辩手正式发言全文，请逐条消化后再总结）：\n`;
      agentContext.forEach((msg, index) => {
        prompt += `${index + 1}. Round${msg.roundNumber ?? '?'} 「${msg.agentId}」：${msg.content}\n`;
      });
      prompt += `\n`;
    } else {
      prompt += `【前两轮辩论记录】：（空）系统未附带任何可读辩词。请仅简短说明无法裁决，不要编造辩论内容。\n\n`;
    }

    if (hasAudience) {
      prompt += `【观众真实声音】（系统已过滤灌水，立场未预先标注；请你自行判断各观点的倾向，在裁决中引用并说明民意分布）：\n`;
      audienceOpinions!.forEach((line, index) => {
        prompt += `${index + 1}. ${line}\n`;
      });
      prompt += `\n`;
    }

    prompt += `【辩题与案情材料】（供对照，不是单独的法律咨询提问）\n`;
    prompt += `- 标题：${caseInfo.title}\n`;
    prompt += `- 背景：${caseBody}\n\n`;

    prompt += `请根据以上【前两轮辩论记录】、案情与观众意见（若有）直接输出综合总结正文，不要输出自我怀疑、不要复述本任务单的元讨论。\n`;
    return prompt;
  }

  /**
   * 根据上次会话的历史摘要，生成一句温暖的开场关心语句。
   * 例如输入"用户因考研焦虑，倾向被倾听" → 输出"上次你提到考研压力很大，最近情况怎么样了？"
   * 失败时返回 null，调用方降级为默认文案。
   */
  async generateOpening(lastMemory: string): Promise<string | null> {
    const prompt = `你是一位专注于大学生群体的 AI 情绪伙伴，用户刚开启了一段新的对话。根据你对这位用户的了解，写一段温暖自然的开场白，让用户感到被记得、被关心。

关于这位用户，你了解到以下内容（含时间和摘要）：
${lastMemory}

开场白要求：
1. 主动提及上次聊过的具体事情（如"上次你提到因为xxx感到xxx"），而不是含糊说"上次的事"，让用户清楚地知道你记得
2. 简短共情或认可当时的感受（一句话即可）
3. 用一个温和的开放式问题结尾，询问现在的状态，例如"这两天有没有好一点？"或"最近有没有什么新的变化？"
4. 语气像熟悉用户的学长/学姐，亲切自然，不生硬，不说教
5. 总长度 60-100 字，不要加引号，不要任何解释，直接输出开场白正文

只返回开场白正文，不要任何前缀或说明。`;
    try {
      const result = await this.callChatOnce(prompt);
      return result?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * 将一段辅导对话浓缩为一句话情绪摘要，用于第四层 RAG 存储。
   * 格式示例："用户因考研焦虑，倾向被倾听而非获得建议"
   * 失败时返回 null，调用方静默忽略。
   */
  async summarizeSession(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    if (messages.length < 2) return null;

    const transcript = messages
      .map((m) => `${m.role === 'USER' ? '用户' : '辅导师'}：${m.content}`)
      .join('\n');

    const prompt = `请将以下心理辅导对话浓缩为一句话（20字以内），格式：[情绪类型] + 核心事件/诉求，例如："用户因考研焦虑，倾向被倾听"。\n\n${transcript}\n\n只返回这一句话，不要解释。`;

    try {
      const result = await this.callChatOnce(prompt);
      return result?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * 单次对话（内部通用实现），收集完整回答后返回。
   */
  private async callChatOnceWithBot(
    botId: string,
    userMessage: string,
  ): Promise<string> {
    const response = await this.client.post(
      '/chat',
      {
        bot_id: botId,
        user_id: 'system',
        stream: true,
        auto_save_history: false,
        additional_messages: [
          { role: 'user', content: userMessage, content_type: 'text' },
        ],
      },
      { responseType: 'stream' },
    );

    return new Promise<string>((resolve, reject) => {
      const stream = response.data as NodeJS.ReadableStream;
      let buffer = '';
      let fullAnswer = '';
      const hasAnswerDeltaByMsgId = new Map<string, boolean>();

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          try {
            const payload = JSON.parse(jsonStr);
            if (String(payload?.type || '') !== 'answer') continue;
            if (typeof payload?.content === 'string' && payload.content) {
              const msgId = String(payload?.id || '');
              const isCompleted = !!payload?.created_at || !!payload?.time_cost;
              const hasDelta = msgId
                ? (hasAnswerDeltaByMsgId.get(msgId) ?? false)
                : false;
              if (!isCompleted) {
                fullAnswer += payload.content;
                if (msgId) hasAnswerDeltaByMsgId.set(msgId, true);
              } else if (!hasDelta) {
                fullAnswer += payload.content;
              }
            }
          } catch {
            /* ignore */
          }
        }
      });

      stream.on('end', () => resolve(fullAnswer.trim()));
      stream.on('error', reject);
    });
  }

  private async callChatOnce(userMessage: string): Promise<string> {
    const botId = process.env.COZE_SUMMARY_BOT_ID || '7636661027257942035';
    return this.callChatOnceWithBot(botId, userMessage);
  }

  /**
   * 情绪风险分析，返回固定 JSON 结构。
   * 使用独立的情感分析 Bot，不影响共情师对话流程。
   */
  async analyzeSentiment(text: string): Promise<{
    emotionType: string;
    intensity: number;
    riskLevel: string;
    summary: string;
  } | null> {
    const SENTIMENT_BOT_ID = '7633056883112476722';
    try {
      const raw = await this.callChatOnceWithBot(SENTIMENT_BOT_ID, text);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);

      const validEmotionTypes = [
        'POSITIVE',
        'CALM',
        'ANXIOUS',
        'ANGRY',
        'SAD',
        'DEPRESSED',
        'DESPERATE',
      ];
      const validRiskLevels = ['NONE', 'MEDIUM', 'HIGH'];

      if (
        !validEmotionTypes.includes(parsed.emotionType) ||
        typeof parsed.intensity !== 'number' ||
        !validRiskLevels.includes(parsed.riskLevel)
      ) {
        return null;
      }

      return {
        emotionType: parsed.emotionType,
        intensity: Math.min(100, Math.max(0, Math.round(parsed.intensity))),
        riskLevel: parsed.riskLevel,
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    } catch {
      return null;
    }
  }
}
