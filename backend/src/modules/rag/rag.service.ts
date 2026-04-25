import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const RAG_BASE_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8001';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  /** 第四层：向量化会话摘要，存入用户专属 ChromaDB 集合 */
  async addMemory(params: {
    userId: number;
    sessionId: number;
    summary: string;
    date: string;
  }): Promise<void> {
    try {
      await axios.post(`${RAG_BASE_URL}/memories/add`, params, {
        timeout: 10000,
      });
    } catch (err: any) {
      this.logger.warn(
        `addMemory 失败（userId=${params.userId}）: ${err.message}`,
      );
    }
  }

  /** 第四层：检索与当前话题最相关的历史摘要，返回"日期：摘要"格式的文本列表 */
  async searchMemories(
    userId: number,
    query: string,
    limit = 3,
  ): Promise<string[]> {
    try {
      const res = await axios.post<{
        memories: { summary: string; date: string }[];
      }>(
        `${RAG_BASE_URL}/memories/search`,
        { userId, query, limit },
        { timeout: 5000 },
      );
      return res.data.memories.map((m) => `${m.date}：${m.summary}`);
    } catch (err: any) {
      this.logger.warn(
        `searchMemories 失败（userId=${userId}）: ${err.message}`,
      );
      return [];
    }
  }

  /** 第三层：处理单条弹幕，返回相关性 + 立场 */
  async processOpinion(
    text: string,
    topic = '',
  ): Promise<{ isRelevant: boolean; stance: string }> {
    try {
      const res = await axios.post<{ isRelevant: boolean; stance: string }>(
        `${RAG_BASE_URL}/process`,
        { text, topic },
        { timeout: 5000 },
      );
      return res.data;
    } catch (err: any) {
      this.logger.warn(`processOpinion 失败: ${err.message}`);
      // RAG 服务不可用时降级：视为有效观点，立场中立
      return { isRelevant: true, stance: 'NEUTRAL' };
    }
  }

  /** 第三层：批量过滤弹幕，返回按立场分组的有效观点 */
  async batchFilter(
    opinions: { id: number; content: string; userId: number }[],
    topic = '',
  ) {
    try {
      const res = await axios.post(
        `${RAG_BASE_URL}/batch-filter`,
        { opinions, topic },
        { timeout: 15000 },
      );
      return res.data;
    } catch (err: any) {
      this.logger.warn(`batchFilter 失败: ${err.message}`);
      return { forA: [], forB: [], neutral: [], filteredCount: 0 };
    }
  }
}
