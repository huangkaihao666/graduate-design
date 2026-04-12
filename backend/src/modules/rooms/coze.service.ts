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
