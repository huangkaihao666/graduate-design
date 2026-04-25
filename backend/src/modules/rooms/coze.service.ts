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
  ): Promise<void> {
    // 打印本次调用概要和 Prompt 片段，方便调试
    const preview = prompt.length > 200 ? `${prompt.slice(0, 200)}...` : prompt;
    this.logger.log(
      `🛰️ Calling Coze API for bot ${botId}. Prompt preview: ${preview}`,
    );

    try {
      const response = await this.client.post(
        '/chat',
        {
          bot_id: botId,
          user_id: 'debate_room_user',
          stream: true,
          auto_save_history: true,
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
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.slice(5).trim();
            try {
              const payload = JSON.parse(jsonStr);
              // 过滤掉 verbose / follow_up 等非答案内容
              const msgType = String(payload?.type || '');
              if (msgType && msgType !== 'answer') {
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
  ): Promise<void> {
    this.logger.log(
      `💚 Counselor chat: bot=${botId}, history=${history.length} msgs`,
    );

    // 把系统级补充 prompt 拼到第一条 user 消息前（Coze 不支持 system role，用 user 消息模拟）
    const messages = history.map((m) => ({
      role: m.role,
      content:
        m.role === 'user' && history.indexOf(m) === 0 && systemPromptExtra
          ? `${systemPromptExtra}\n\n${m.content}`
          : m.content,
      content_type: 'text',
    }));

    try {
      const response = await this.client.post(
        '/chat',
        {
          bot_id: botId,
          user_id: 'counselor_user',
          stream: true,
          auto_save_history: false,
          additional_messages: messages,
        },
        { responseType: 'stream' },
      );

      const stream = response.data as NodeJS.ReadableStream;
      let buffer = '';
      const hasAnswerDeltaByMsgId = new Map<string, boolean>();

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

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
                const isCompleted =
                  !!payload?.created_at || !!payload?.time_cost;
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
        });
        stream.on('end', () => resolve());
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
    context: Array<{ agentId: string; content: string }>,
    agentRole: string,
    meta: {
      roundNumber: number;
      phase: 'statement' | 'rebuttal' | 'verdict';
      speakingOrderHint?: string;
      maxChars?: number;
    },
  ): string {
    let prompt = `你现在是一个多智能体辩论系统中的「${agentRole}」。\n`;
    prompt += `当前为第 ${meta.roundNumber} 轮（${meta.phase === 'statement' ? '立场陈述' : meta.phase === 'rebuttal' ? '交叉反驳' : '律师裁决'}）。\n`;
    if (meta.speakingOrderHint) {
      prompt += `发言顺序提示：${meta.speakingOrderHint}\n`;
    }
    prompt += `\n`;

    prompt += `案件背景：\n- 标题：${caseInfo.title}\n- 内容：${caseInfo.content}\n\n`;

    if (context.length > 0) {
      prompt += `对方观点（供你回应/反驳，需引用具体点再回应）：\n`;
      context.forEach((msg, index) => {
        prompt += `- 观点${index + 1}（来自 ${msg.agentId}）：${msg.content}\n`;
      });
      prompt += `\n`;
    }

    return prompt;
  }
}
