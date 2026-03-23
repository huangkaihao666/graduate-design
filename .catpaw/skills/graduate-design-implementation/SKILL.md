---
name: graduate-design-implementation
description: 基于多智能体协同与RAG架构的社交化生活决策辅助平台，使用 Coze AI 构建三个独立智能体、NestJS 编排辩论工作流、React 前端、Socket.io 实时交互。当实现辩论庭页面、智能体编排、WebSocket 通信、投票系统等功能，或排查多智能体协同问题时使用本 Skill。
---

# 毕业设计：基于多智能体协同与RAG架构的社交化生活决策辅助平台

## 项目背景与核心理念

普通人每天都在面临两难选择（如"被老板PUA要不要裸辞？"、"遇到奇葩室友怎么优雅回击？"）。传统社区（知乎、小红书）回复慢、容易沉底，且充满主观情绪。本项目打造一个由"人类 + AI 智能体"共同组成的决策众包平台，为用户提供即时、多维的解决方案。

**双边市场模型**：

- **求助者**：发布生活困境或人际冲突
- **吃瓜群众/智囊团**：实时围观，给 AI 智能体投票或补充人类观点
- **核心机制**：平台自动拉起"多智能体陪审团"（毒舌现实主义者、温柔共情者、理智律师），在后端工作流控制下交叉辩论，最终输出多维行动建议

**三大 AI 技术结合点**：

- **RAG 向量数据库**：存储心理学效应、博弈论模型、法律常识及高赞历史决策，Agent 辩论时引经据典
- **多智能体博弈（Multi-Agent Debate）**：不同 Agent 持对立立场互相反驳（Cross-examination），穷尽视角可能性
- **大模型工作流（Workflow）**：控制辩论轮次（开场陈述 ➡️ 自由辩论 ➡️ 总结陈词），允许人类用户在特定节点插嘴干预

---

## 核心技术架构

```
前端 (React 18)
    ↓ WebSocket (Socket.io)
NestJS 工作流引擎（辩论流转编排器 / 法官）
    ↓ HTTP API
Coze 平台（3 个独立 Bot + 各自内部工作流）
    ↓ RAG 集成
知识库（心理学 / 法律 / 博弈论）
```

**核心原则**：NestJS 是"法官"，全权控制辩论流程；Coze Bot 是"陪审员"，专注生成高质量专业论点。

---

## 架构模式

### 模式一：三个独立 Bot 与 RAG 集成

**Bot A（毒舌现实主义者）**

- 知识库：社会学、博弈论、逻辑谬误识别
- 内部工作流：「反伪善拆解工作流」—— 提取用户描述中的逻辑漏洞和隐藏利益动机，作为毒舌反击的弹药
- Prompt 策略：犀利直接，直击痛点

**Bot B（温柔共情者）**

- 知识库：心理学、非暴力沟通
- 内部工作流：「情绪画像分析工作流」—— 分析用户潜在情绪状态（焦虑、自责等），匹配 RAG 安抚话术模板
- Prompt 策略：温暖包容，情感支撑

**Bot C（理智律师）**

- 知识库：民法典、劳动法、合同法
- 内部工作流：「法律要素提取与溯源工作流」—— 强制提取时间/地点/金额/合同要素，要素缺失则追问，齐全则精准检索法条原文
- Prompt 策略：中立客观，只讲事实和法律风险

### 模式二：NestJS 辩论流转编排

NestJS 对辩论进程有绝对控制权：

**第一轮 - 开场陈述**（并发）

```
NestJS → [Bot A, Bot B] 并发调用，传入用户困境
         ↓         ↓
    各自独立输出开场观点
         ↓         ↓
    NestJS 收集两方回复
```

**第二轮 - 交叉辩论**（顺序）

```
NestJS → Bot B："毒舌刚才说应该立刻辞职，你怎么看？"
NestJS → Bot A："共情者说xxx，你的反驳是？"
NestJS → Bot C："以下是前两轮辩论记录，请给出法律分析"
```

**第三轮 - 结案总结**

```
NestJS → Bot C："综合辩论，生成最终多维行动指南"
NestJS 将结果存入数据库
NestJS 向所有观众广播辩论结束
```

### 模式三：WebSocket 房间隔离与权限分级

**房间架构**：每个案件对应一个 Socket.io 房间（唯一 roomId），求助者和观众同在一个房间，权限不同：

- **案件所有者（owner）**：可打断辩论、补充案情、要求 Agent 聚焦特定问题
- **观众（spectator）**：只能发弹幕、投票、表情互动

**JWT + Socket 鉴权**：

```javascript
// NestJS 在 Socket 连接时解析 JWT 拿到 userId
const userId = await this.authService.validateToken(handshake.auth.token);
const caseOwnerId = await this.caseService.getOwnerId(roomId);

if (userId === caseOwnerId) {
  client.data.role = "owner"; // 开启高级权限
} else {
  client.data.role = "spectator";
}
```

### 模式四：Coze 流式输出 → WebSocket 实时转发

**问题**：Coze 返回 SSE 流，不能等全部完成再发送给前端。

**解决方案 - 逐块广播**：

```javascript
// NestJS 接收 Coze 流，逐块转发到房间
response.on("data", (chunk) => {
  const text = parseChunkText(chunk);
  this.server.to(roomId).emit("stream_chunk", {
    agentId: "bot_A",
    text: text,
    timestamp: Date.now(),
  });
});
```

**React 前端 - 打字机效果**：

```javascript
socket.on("stream_chunk", (data) => {
  setMessages((prev) => {
    const lastMsg = prev[prev.length - 1];
    if (lastMsg?.agentId === data.agentId) {
      lastMsg.content += data.text; // 追加到同一条消息
      return [...prev];
    }
    return [...prev, { agentId: data.agentId, content: data.text }];
  });
});
```

### 模式五：NestJS 上下文记忆管理

**问题**：Coze Bot 之间相互独立，Bot B 不知道 Bot A 说了什么。

**解决方案 - NestJS 充当记忆中枢**：

```javascript
// Bot A 回复后存入 Redis
await redis.set(
  `room:${roomId}:context`,
  JSON.stringify({
    round: 1,
    botA_opening: "[Bot A 的完整回复]",
    timestamp: Date.now(),
  }),
);

// 调用 Bot B 时，将 Bot A 的观点注入 system prompt
const systemPrompt = `
你是温柔共情者。用户困境：${userDilemma}
毒舌现实主义者刚才说："${botA_statement}"
你的任务：温和地挑战其观点，并提供情感支撑。
`;
```

### 模式六：投票原子操作与实时同步

**问题**：高并发投票请求产生数据竞争条件。

**解决方案 - Prisma 原子操作**：

```javascript
// 原子递增，避免丢失更新
await prisma.agentStats.update({
  where: { roomId_agentId: { roomId: parseInt(roomId), agentId } },
  data: { votes: { increment: 1 } },
});

// 广播最新支持率到房间
this.server.to(roomId).emit("vote_update", {
  agentId,
  votes: stats.votes,
  percentage: calculatePercentage(stats.votes),
});
```

---

## 完整页面规划（8 个页面）

| 页面                                   | 关键功能                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **登录/注册页 (Auth)**                 | 标准表单，JWT 鉴权                                                                                       |
| **道德广场 (Plaza)**                   | Live / Archived 案件卡片流，显示围观人数与支持率                                                         |
| **发布案件页 (Create Case)**           | 富文本困境描述 + 动态挑选 AI 陪审团（勾选 3 个 Agent）                                                   |
| **⭐ 沉浸式辩论庭 (Live Debate Room)** | 左：案件详情与证据补充；中：AI 群聊主舞台（打字机效果）；右：弹幕聊天区；底：动态支持率进度条 + 投票按钮 |
| **结案报告页 (Case Report)**           | 律师生成《多维行动指南》，展示胜出方                                                                     |
| **AI 陪审员图鉴 (Agent Gallery)**      | 各 AI 人设卡片、历史胜率、高赞金句                                                                       |
| **个人主页 (Profile)**                 | 我的案件、投票历史；赛博性格雷达图（理性 vs 共情倾向）                                                   |
| **后台管理页 (Admin)**                 | 违规言论封禁、房间状态管理（加分项）                                                                     |

---

## 常见陷阱与解决方案

**陷阱一：误以为 Coze 会记住多轮上下文**

- 每次 HTTP 调用都是全新 Session，不保留历史。必须在 system prompt 中手动注入完整上下文。

**陷阱二：等待流式响应完全结束才推送**

- 等 `response.end()` 会造成明显延迟。应在每个 chunk 到达时立即 emit 给前端。

**陷阱三：投票并发竞争条件**

- 不能先读再写。使用 Prisma 的 `{ increment: 1 }` 原子操作绕过读-改-写竞争。

**陷阱四：Bot 人设崩塌（三个 Bot 观点趋同）**

- 必须刻意设计对立的 Prompt。Bot A 要唱反调，Bot B 要共情验证，Bot C 要强制法律视角。张力是设计目标，不是 bug。

**陷阱五：WebSocket 消息丢失**

- 关键数据（投票）：实现显式 ACK + 重试机制
- 非关键数据（弹幕）：断线重连后从数据库同步

---

## 开发推进顺序

1. **后端优先**：建立 NestJS 编排引擎和 WebSocket 基础
2. **Coze 集成**：单独测试每个 Bot，再接入 NestJS 工作流
3. **实时同步**：完善流式解析与房间广播
4. **前端构建**：先渲染辩论 UI，再添加投票与互动功能
5. **打磨收尾**：性能优化、边缘情况处理、答辩准备
