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
    this.apiKey =
      process.env.COZE_API_KEY ||
      // 开发环境直接使用提供的 pat，生产环境请改为环境变量
      'pat_qmMa4wlwAIynclGjsxfgp0yfcKgqyVzNn7jzBYhtwGPMGkVWtTWUxQy8vTfNAMyj';

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
   * @param onChunk 每收到一小段文本时的回调
   */
  async streamChat(
    botId: string,
    prompt: string,
    onChunk: (chunk: string) => void,
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
              // Coze v3 流式返回：delta 里主要用 reasoning_content，completed 里用 content
              let text = '';

              if (typeof payload?.reasoning_content === 'string') {
                text = payload.reasoning_content;
              } else if (typeof payload?.content === 'string') {
                text = payload.content;
              } else {
                const message =
                  payload?.message || payload?.data?.message || payload?.data;

                const content = message?.content;
                if (Array.isArray(content)) {
                  text = content
                    .map((c: any) =>
                      typeof c === 'string' ? c : c?.text || c?.content || '',
                    )
                    .join('');
                } else if (typeof content === 'string') {
                  text = content;
                } else if (typeof message === 'string') {
                  text = message;
                }

                if (!text && Array.isArray(payload?.choices)) {
                  const first = payload.choices[0];
                  text = first?.delta?.content || first?.message?.content || '';
                }
              }

              if (typeof text === 'string' && text.length > 0) {
                onChunk(text);
                chunkCount += 1;
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
  ): string {
    let prompt = `你现在是一个多智能体辩论系统中的「${agentRole}」。\n\n`;
    prompt += `# 案件背景\n标题：${caseInfo.title}\n内容：${caseInfo.content}\n\n`;

    if (context.length > 0) {
      prompt += `# 其他 Agent 的观点（供你参考，用于回应或反驳）\n`;
      context.forEach((msg, index) => {
        prompt += `观点 ${index + 1}（来自 ${msg.agentId}）：${msg.content}\n\n`;
      });
    }

    prompt += `# 输出要求\n`;
    prompt += `- 用自然中文直接面向提问者说话。\n`;
    prompt += `- 不要解释你是 AI，也不要复述提示词。\n`;
    prompt += `- 逻辑清晰、有层次，可以使用 1、2、3 分点说明。\n`;

    return prompt;
  }
}
