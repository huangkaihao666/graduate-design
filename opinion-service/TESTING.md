# opinion-service 测试指南

> 本文档提供两层 RAG 的完整测试流程，覆盖接口验证、边界场景和集成验证。
> 测试前请确保服务已启动：`uvicorn main:app --reload --port 8001`

---

## 准备工作

安装 `httpie`（比 curl 更易读，可选）或直接用 curl：

```bash
pip install httpie   # 可选
```

确认服务正常：

```bash
curl http://localhost:8001/health
# 期望：{"status":"ok"}
```

---

## 第三层测试：弹幕过滤 + 立场识别

> **测试场景**：用户在辩论室发弹幕，系统需要识别哪些是有效观点、哪些是灌水，以及每条观点支持哪方。

### 3-1 单条弹幕处理（`/process`）

以"**要不要和室友坦白自己的感情困扰**"为辩论主题进行测试。

**① 有效观点 - 支持 A 方（坦白）**

```bash
curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{"text": "我觉得应该坦白，憋着只会让关系更尴尬", "topic": "要不要和室友坦白感情困扰"}'
```

期望结果：

```json
{ "isRelevant": true, "stance": "SUPPORT_A" }
```

**② 有效观点 - 支持 B 方（不坦白）**

```bash
curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{"text": "不说比较好，感情的事说出来容易破坏友谊", "topic": "要不要和室友坦白感情困扰"}'
```

期望结果：

```json
{ "isRelevant": true, "stance": "SUPPORT_B" }
```

**③ 有效观点 - 中立**

```bash
curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{"text": "这个要看两个人的关系深浅，不能一概而论", "topic": "要不要和室友坦白感情困扰"}'
```

期望结果：

```json
{ "isRelevant": true, "stance": "NEUTRAL" }
```

**④ 灌水弹幕 - 应被过滤**

```bash
# 纯表情/刷屏
curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{"text": "哈哈哈哈哈哈", "topic": "要不要和室友坦白感情困扰"}'

curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{"text": "666", "topic": "要不要和室友坦白感情困扰"}'

curl -X POST http://localhost:8001/process \
  -H "Content-Type: application/json" \
  -d '{"text": "第一", "topic": "要不要和室友坦白感情困扰"}'
```

期望结果（三条均应返回）：

```json
{ "isRelevant": false, "stance": "NEUTRAL" }
```

---

### 3-2 批量过滤（`/batch-filter`）

模拟 60 秒征集窗口结束后，对一批混合弹幕做批量处理：

```bash
curl -X POST http://localhost:8001/batch-filter \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "要不要和室友坦白感情困扰",
    "opinions": [
      {"id": 1, "content": "坦白吧，说清楚才能继续做朋友", "userId": 101},
      {"id": 2, "content": "不要说，说了只会让室友不知所措", "userId": 102},
      {"id": 3, "content": "哈哈哈哈", "userId": 103},
      {"id": 4, "content": "666", "userId": 104},
      {"id": 5, "content": "我支持坦白，隐瞒下去迟早爆发", "userId": 105},
      {"id": 6, "content": "坦白了也不一定有好结果，不如算了", "userId": 106},
      {"id": 7, "content": "这种事情要看具体情况", "userId": 107},
      {"id": 8, "content": "第一", "userId": 108}
    ]
  }'
```

期望结果：

```json
{
  "forA": [
    { "id": 1, "content": "坦白吧，说清楚才能继续做朋友", "userId": 101 },
    { "id": 5, "content": "我支持坦白，隐瞒下去迟早爆发", "userId": 105 }
  ],
  "forB": [
    { "id": 2, "content": "不要说，说了只会让室友不知所措", "userId": 102 },
    { "id": 6, "content": "坦白了也不一定有好结果，不如算了", "userId": 106 }
  ],
  "neutral": [{ "id": 7, "content": "这种事情要看具体情况", "userId": 107 }],
  "filteredCount": 3
}
```

> `filteredCount: 3` 对应 id=3（哈哈哈哈）、id=4（666）、id=8（第一）被过滤。

---

### 3-3 语义去重验证

发两条语义相近的弹幕，验证去重逻辑（只保留第一条）：

```bash
curl -X POST http://localhost:8001/batch-filter \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "要不要和室友坦白感情困扰",
    "opinions": [
      {"id": 1, "content": "应该坦白，说出来心里会好受", "userId": 101},
      {"id": 2, "content": "坦白出来，说了心里舒服一点", "userId": 102},
      {"id": 3, "content": "不说，保持现状就好", "userId": 103}
    ]
  }'
```

期望：id=1 和 id=2 语义高度相似，`forA` 只保留 id=1（先来先得）。

---

## 第四层测试：情绪记忆存取

> **测试场景**：用户和共情师聊了几次，系统需要记住历史，下次聊相关话题时自动检索注入。

### 4-1 存入历史摘要（`/memories/add`）

模拟用户（userId=1）完成了三次会话，依次存入摘要：

```bash
# 第一次会话：考研压力
curl -X POST http://localhost:8001/memories/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "sessionId": 101,
    "summary": "用户因考研压力焦虑，担心复习时间不够，倾向被倾听而非获得建议",
    "date": "2026-04-10"
  }'

# 第二次会话：和室友的矛盾
curl -X POST http://localhost:8001/memories/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "sessionId": 102,
    "summary": "用户与室友因作息不同产生矛盾，情绪低落，希望获得沟通建议",
    "date": "2026-04-18"
  }'

# 第三次会话：找工作迷茫
curl -X POST http://localhost:8001/memories/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "sessionId": 103,
    "summary": "用户对毕业后方向迷茫，纠结考研还是工作，情绪平稳但有压力",
    "date": "2026-04-22"
  }'
```

每条期望返回：

```json
{ "success": true }
```

---

### 4-2 检索历史记忆（`/memories/search`）

**① 检索与"学习压力"相关的记忆**

```bash
curl -X POST http://localhost:8001/memories/search \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "query": "最近学习压力很大，感觉快撑不住了", "limit": 3}'
```

期望：考研压力（sessionId=101）排在最前，相关性分数最高：

```json
{
  "memories": [
    {
      "summary": "用户因考研压力焦虑，担心复习时间不够，倾向被倾听而非获得建议",
      "date": "2026-04-10",
      "sessionId": 101,
      "score": 0.85
    },
    {
      "summary": "用户对毕业后方向迷茫，纠结考研还是工作，情绪平稳但有压力",
      "date": "2026-04-22",
      "sessionId": 103,
      "score": 0.72
    }
  ]
}
```

**② 检索与"人际关系"相关的记忆**

```bash
curl -X POST http://localhost:8001/memories/search \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "query": "和朋友闹矛盾了，不知道怎么处理", "limit": 3}'
```

期望：室友矛盾（sessionId=102）排在最前：

```json
{
  "memories": [
    {
      "summary": "用户与室友因作息不同产生矛盾，情绪低落，希望获得沟通建议",
      "date": "2026-04-18",
      "sessionId": 102,
      "score": 0.88
    }
  ]
}
```

**③ 验证用户隔离（不同用户记忆不互通）**

```bash
# userId=2 没有存过任何记忆，应返回空列表
curl -X POST http://localhost:8001/memories/search \
  -H "Content-Type: application/json" \
  -d '{"userId": 2, "query": "考研压力", "limit": 3}'
```

期望：

```json
{ "memories": [] }
```

---

### 4-3 覆盖更新验证（同 sessionId 重复写入）

同一 sessionId 重复 add 应覆盖，不会产生重复记录：

```bash
# 覆盖 sessionId=101 的摘要
curl -X POST http://localhost:8001/memories/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "sessionId": 101,
    "summary": "用户因考研压力焦虑（已更新），已逐渐找到复习节奏",
    "date": "2026-04-10"
  }'

# 再次检索，应返回更新后的摘要
curl -X POST http://localhost:8001/memories/search \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "query": "考研复习", "limit": 1}'
```

期望：返回更新后的摘要文本（含"已更新"字样），不出现两条 sessionId=101 的记录。

---

## 集成验证：在前端触发完整链路

完成上述接口测试后，可在前端验证端到端流程：

### 第三层集成验证

1. 启动后端 + 前端 + opinion-service
2. 进入任意辩论室，等待 Round1 结束
3. 看到"发表你的看法，影响第二轮辩论走向"提示条后，发送以下弹幕：
   - `我觉得A方说的对`（有效观点）
   - `哈哈哈哈哈`（灌水）
   - `B方更有道理`（有效观点）
4. 60 秒后查看数据库 `UserOpinion` 表：

```bash
# 在 backend/ 目录执行
npx prisma studio
# 打开 UserOpinion 表，确认：
# - "我觉得A方说的对" → isRelevant=true, stance=SUPPORT_A
# - "哈哈哈哈哈"      → isRelevant=false, stance=NEUTRAL
# - "B方更有道理"     → isRelevant=true, stance=SUPPORT_B
```

### 第四层集成验证

1. 进入 AI 共情师，新建会话，聊几句关于"考研压力"的内容
2. 点击"结束会话"
3. 等待约 5-10 秒（后台异步生成摘要 + 向量化），查看数据库：

```bash
npx prisma studio
# 打开 CounselingSession 表，确认 summary 字段已被填入
```

4. 新建第二个会话，输入"最近学习压力很大"，**停顿 1 秒不发送**
5. 查看后端日志，确认 `/memories/search` 被调用（前端 onChange 防抖触发预检索）
6. 发送消息，观察共情师回复是否包含对上次会话的引用（如"上次你提到考研..."）

---

## 常见问题

**Q：`/process` 返回的 stance 总是 NEUTRAL？**

A：`stance_detector` 依赖 `support_a` 和 `support_b` 集合，这两个集合目前为空（只有 `irrelevant` 和 `relevant` 是预构建的）。立场识别需要积累足够多的带标注弹幕数据后才会准确，初期 NEUTRAL 是正常现象。

**Q：`/memories/search` 返回的 score 很低（< 0.5）？**

A：ChromaDB 使用 L2 距离转换，score 的绝对值不重要，重要的是**相对排序**——score 最高的就是最相关的。只要排序符合预期即可。

**Q：服务启动时报 `Ollama warmup 失败`？**

A：确认 Ollama 正在运行（`ollama serve`），并已拉取模型（`ollama pull nomic-embed-text`）。

---

## 端到端使用验证

> 以下是两个完整的使用场景，按步骤操作后检查对应的验证点，确认 RAG 功能真正生效。
>
> **前置条件**：后端、前端、opinion-service 三个服务均已启动。

---

### 场景一：辩论室弹幕过滤验证

**辩题**：`分手后要不要和前任保持联系`

这个辩题情绪化、立场分明，容易产生有效观点和灌水弹幕的混合，适合验证第三层 RAG。

#### 操作步骤

**第一步**：在平台发起一场辩论，辩题填写：

```
分手后要不要和前任保持联系
```

智能体选择默认的三个即可（毒舌现实主义者 / 温柔共情者 / 理智律师）。

**第二步**：进入辩论室，等待 Round1 结束。看到聊天区顶部出现蓝色提示条（"发表你的看法，影响第二轮辩论走向"）后，在 **60 秒内**依次发送以下弹幕：

| 发送内容                                               | 预期分类                         |
| ------------------------------------------------------ | -------------------------------- |
| `保持联系只会让自己更难走出来，果断断联才是对自己负责` | 有效观点                         |
| `完全断联太绝了，好聚好散朋友还是可以做的`             | 有效观点                         |
| `哈哈哈哈哈哈`                                         | 灌水，应被过滤                   |
| `这要看两个人分手的原因，不能一概而论`                 | 有效观点                         |
| `666`                                                  | 灌水，应被过滤                   |
| `断联！断联！断联！`                                   | 有效观点（重复强调，但内容相关） |

**第三步**：60 秒倒计时结束后，提示条变为"已收集 XX 条观点注入第二轮辩论"。

**第四步**：观察 Round2，Bot 的发言里是否出现了对用户观点的引用，例如：

- 毒舌现实主义者引用了"断联才是对自己负责"
- 温柔共情者引用了"好聚好散朋友还是可以做的"

#### 验证点

Round2 结束后，打开数据库查看 `UserOpinion` 表：

```bash
cd backend && npx prisma studio
```

打开 `UserOpinion` 表，找到刚才这场辩论的记录，逐行确认：

| content                       | 期望 isRelevant | 期望 stance                 |
| ----------------------------- | --------------- | --------------------------- |
| 保持联系只会让自己更难走出来… | `true`          | `NEUTRAL`（立场库暂无数据） |
| 完全断联太绝了…               | `true`          | `NEUTRAL`                   |
| 哈哈哈哈哈哈                  | **`false`**     | `NEUTRAL`                   |
| 这要看两个人分手的原因…       | `true`          | `NEUTRAL`                   |
| 666                           | **`false`**     | `NEUTRAL`                   |
| 断联！断联！断联！            | `true`          | `NEUTRAL`                   |

> **关键验证点**：`哈哈哈哈哈哈` 和 `666` 的 `isRelevant` 必须是 `false`，其余四条必须是 `true`。如果灌水没被过滤，说明 RAG 服务未正常接入。

---

### 场景二：AI 共情师跨会话记忆验证

**验证目标**：完成两次会话后，第三次聊相关话题时，共情师能主动引用之前聊过的内容。

#### 第一次会话：建立"考研焦虑"记忆

**操作**：进入 AI 共情师，点击"新对话"。

> **验证冷启动**：新建会话后，聊天区应该直接出现共情师的开场白，不需要你先说话。
> 第一次使用时显示固定欢迎语；有历史记忆后会显示关心上次话题的语句（如"上次你提到考研压力，最近怎么样了？"）。

依次发送：

```
我最近考研压力特别大，每天睡不好，感觉复习根本来不及
```

等共情师回复后，继续发送：

```
我不需要什么建议，就是想说说，感觉憋着很难受
```

等共情师回复后，**直接点击"新对话"**（不需要手动关闭会话，新建会话会自动触发上一个会话的归档）。

**等待约 10 秒**，让后台完成摘要生成和向量化。

**验证**：打开数据库 `CounselingSession` 表，找到刚才的会话，确认 `summary` 字段已被填入类似内容：

```
用户因考研压力焦虑，睡眠不佳，倾向被倾听而非获得建议
```

---

#### 第二次会话：建立"人际关系"记忆

点击"新对话"后，**观察开场白**：此时共情师应该主动提到上次聊过的考研内容，例如：

> "上次你提到考研复习压力很大，最近状态有好一些吗？"

然后发送：

```
我和我最好的朋友闹矛盾了，她觉得我最近太冷漠，但我只是压力大没心思联系她
```

等共情师回复后发送：

```
我知道是我的问题，但就是不知道怎么开口道歉
```

同样**点击"新对话"**触发归档，等待约 10 秒。

---

#### 第三次会话：触发跨会话记忆

点击"新对话"，**观察开场白**：此时共情师应该提到最近一次会话的内容（朋友矛盾）。

然后在输入框输入以下内容，**先停顿 1-2 秒不要发送**（触发前端防抖预检索）：

```
最近状态很差，学习上压力很大，和朋友的关系也出了问题
```

发送后观察共情师的回复，应该同时引用两段历史记忆，例如：

> "我记得你之前提到考研复习的压力，一直睡不好……"
>
> "上次你说和朋友的矛盾，现在那边情况怎么样了？"

---

#### 进阶验证：用侧面话题触发记忆（更有说服力）

上面的方式直接提到了"学习压力"和"朋友关系"，共情师可能只是正常联想，不一定是 RAG 起的作用。

更有说服力的验证方式是：**换一个侧面话题，不直接提之前聊过的关键词**，看共情师是否能通过语义相似度检索到历史并主动引出。

新建第四次会话，发送：

```
我最近不想回家，见到家里人就烦
```

> 注意：这句话里没有"考研"也没有"朋友"，但语义上和"压力大、情绪逃避"高度相关。

**停顿 1-2 秒后发送**，观察回复。

如果 RAG 正常工作，共情师应该主动把历史记忆关联进来，例如：

> "上次你提到考研压力大、睡不好，是不是这些事情也让你觉得回家更难放松？"
>
> "你之前说和朋友的矛盾让你不知道怎么开口，家里的关系是不是也有类似的感觉？"

**关键验证点**：你这条消息里完全没有提"考研"或"朋友"，共情师主动提起这两件事，只能是从历史记忆里检索来的——这就是 RAG 在起作用的直接证据。

**对比验证**（更直观）：用另一个没有历史记忆的账号发同一句话，共情师只会泛泛回应"不想回家"，不会提到任何具体细节，两次对比差异一目了然。

---

#### 排查步骤（如果共情师没有引用历史内容）

**第一步**：确认摘要已生成

```bash
cd backend && npx prisma studio
# 打开 CounselingSession 表
# 找到第一、二次会话，确认 summary 字段不为空
```

**第二步**：确认记忆已存入 ChromaDB（将 userId 替换为你的实际用户 ID，在 User 表里查）

```bash
curl -X POST http://localhost:8001/memories/search \
  -H "Content-Type: application/json" \
  -d '{"userId": 你的userId, "query": "不想回家，见到家里人就烦", "limit": 3}'
```

期望返回考研或朋友相关的历史摘要，说明语义检索命中了。

**第三步**：确认预检索被触发

查看后端日志（运行 `pnpm backend:dev` 的终端），搜索 `POST /counseling/sessions` 和 `prefetch` 关键词，确认用户打字时预检索接口被调用。

```text
🔌 WebSocket 服务: ws://localhost:3000/socket.io/
[Nest] 66491  - 2026/04/25 17:45:59     LOG [CounselingService] [RAG] prefetch sessionId=28 query="wo" → 3 条记忆: ["2026-04-25：[焦虑]只想倾诉，拒绝建议","2026-04-25：[委屈]用户因朋友误解求助","2026-04-25：[焦虑]考研压力大，求倾听"]
[Nest] 66491  - 2026/04/25 17:46:01     LOG [CounselingService] [RAG] prefetch sessionId=28 query="wo zui jin" → 3 条记忆: ["2026-04-25：[焦虑]只想倾诉，拒绝建议","2026-04-25：[委屈]用户因朋友误解求助","2026-04-25：[焦虑]考研压力大，求倾听"]
[Nest] 66491  - 2026/04/25 17:46:03     LOG [CounselingService] [RAG] prefetch sessionId=28 query="我最近不想回家" → 3 条记忆: ["2026-04-25：[烦躁] 用户因家人关系不想回家","2026-04-25：[委屈]用户因朋友误解求助","2026-04-25：[焦虑]只想倾诉，拒绝建议"]
[Nest] 66491  - 2026/04/25 17:46:03     LOG [CounselingService] [RAG] prefetch sessionId=28 query="我最近不想回家，" → 3 条记忆: ["2026-04-25：[烦躁] 用户因家人关系不想回家","2026-04-25：[委屈]用户因朋友误解求助","2026-04-25：[焦虑]只想倾诉，拒绝建议"]
[Nest] 66491  - 2026/04/25 17:46:09     LOG [CounselingService] [RAG] prefetch sessionId=28 query="我最近不想回家，见到jia" → 3 条记忆: ["2026-04-25：[烦躁] 用户因家人关系不想回家","2026-04-25：[焦虑]只想倾诉，拒绝建议","2026-04-25：[委屈]用户因朋友误解求助"]
[Nest] 66491  - 2026/04/25 17:46:11     LOG [CounselingService] [RAG] prefetch sessionId=28 query="我最近不想回家，见到家里人jiu fan" → 3 条记忆: ["2026-04-25：[烦躁] 用户因家人关系不想回家","2026-04-25：[焦虑]只想倾诉，拒绝建议","2026-04-25：[委屈]用户因朋友误解求助"]
[Nest] 66491  - 2026/04/25 17:46:12     LOG [CounselingService] [RAG] prefetch sessionId=28 query="我最近不想回家，见到家里人就烦" → 3 条记忆: ["2026-04-25：[烦躁] 用户因家人关系不想回家","2026-04-25：[焦虑]只想倾诉，拒绝建议","2026-04-25：[委屈]用户因朋友误解求助"]
[Nest] 66491  - 2026/04/25 17:46:16     LOG [CounselingService] [RAG] sendMessage sessionId=28 缓存命中 3 条: ["2026-04-25：[烦躁] 用户因家人关系不想回家","2026-04-25：[焦虑]只想倾诉，拒绝建议","2026-04-25：[委屈]用户因朋友误解求助"]
[Nest] 66491  - 2026/04/25 17:46:16     LOG [CounselingService] [RAG] 注入 prompt，记忆内容:
  1. 2026-04-25：[烦躁] 用户因家人关系不想回家
  2. 2026-04-25：[焦虑]只想倾诉，拒绝建议
  3. 2026-04-25：[委屈]用户因朋友误解求助
[Nest] 66491  - 2026/04/25 17:46:16     LOG [CozeService] 💚 Counselor chat: bot=7632299425355792393, history=2 msgs
```
