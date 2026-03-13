import { Injectable, Logger } from '@nestjs/common';

/**
 * Coze API 集成服务（模拟版本）
 * 真实的 Coze API 调用将在后续替换
 */
@Injectable()
export class CozeService {
  private readonly logger = new Logger(CozeService.name);

  /**
   * 模拟调用 Coze AI Agent 获取流式响应
   * @param agentId Agent ID
   * @param prompt 用户输入的 prompt
   * @param onChunk 接收到 chunk 时的回调函数
   */
  async streamChat(
    agentId: string,
    prompt: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    this.logger.log(`Calling Coze API for agent ${agentId}`);

    // 模拟不同 Agent 的回复
    const responses = this.getMockResponse(agentId, prompt);

    // 模拟流式输出
    for (const char of responses) {
      // 模拟网络延迟
      await this.delay(30 + Math.random() * 20);
      onChunk(char);
    }

    this.logger.log(`Finished streaming for agent ${agentId}`);
  }

  /**
   * 获取模拟回复
   */
  private getMockResponse(agentId: string, prompt: string): string {
    const responses: Record<string, string[]> = {
      bot_A: [
        '听我说，你这个困境其实挺常见的。我直接告诉你现实：这种情况下，你必须做出选择，而且要快。别犹豫了，时间不等人。',
        '根据我的观察，大多数人在你这种情况下都会选择稳妥的方案。冒险虽然诱人，但失败的代价你承受得起吗？',
        '说实话，你得面对现实。理想很丰满，现实很骨感。我建议你先解决眼前的问题，长远规划可以慢慢来。',
      ],
      bot_B: [
        '我理解你现在的感受，这确实是一个艰难的抉择。但请记住，每个选择背后都有它的意义。让我们一起分析一下...',
        '你的困惑是完全正常的。很多人在面临重大决策时都会有这样的焦虑。重要的是，我们要倾听内心的声音。',
        '我想告诉你，无论你做出什么选择，都是勇敢的。因为你正在为自己的人生负责。让我给你一些建议...',
      ],
      bot_C: [
        '综合刚才两位的观点，我认为这个问题需要从多个维度来看。首先，现实考虑是必要的，但也不能忽视情感需求。',
        '让我来总结一下：一方面，务实的建议提醒我们要考虑风险；另一方面，共情的理解告诉我们要尊重内心。',
        '我的建议是：在做决定之前，先问自己三个问题：1) 最坏的结果是什么？2) 我能接受吗？3) 五年后我会后悔吗？',
      ],
    };

    const agentResponses = responses[agentId] || responses['bot_A'];
    const randomIndex = Math.floor(Math.random() * agentResponses.length);
    return agentResponses[randomIndex];
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    let prompt = `# 案件背景\n标题：${caseInfo.title}\n内容：${caseInfo.content}\n\n`;

    if (context.length > 0) {
      prompt += `# 其他 Agent 的观点\n`;
      context.forEach((msg) => {
        prompt += `${msg.agentId}: ${msg.content}\n\n`;
      });
    }

    prompt += `# 你的角色\n${agentRole}\n\n请基于以上信息，给出你的观点和建议。`;

    return prompt;
  }
}
