# opinion-service

本地 RAG 微服务，基于 FastAPI + ChromaDB + Ollama，服务平台的两层本地 RAG：

| 层次               | 用途                      | 触发时机                                      |
| ------------------ | ------------------------- | --------------------------------------------- |
| **第三层（静态）** | 辩论室弹幕过滤 + 立场识别 | Round1 结束后 60 秒征集窗口，每条弹幕异步处理 |
| **第四层（动态）** | AI 共情师跨会话情绪记忆   | 会话结束后存摘要；用户打字时预检索            |

所有组件开源免费，全部本地运行，不需要任何 API Key。

---

## 快速启动

**使用前必读：** opinion-service 启动时会立刻连本机 **Ollama**（默认 `127.0.0.1:11434`）做嵌入预热并加载知识库。**只重启了本服务、或电脑刚重启**，Ollama 若没跟着起来，会出现 **`[WinError 10061] 由于目标计算机积极拒绝，无法连接`** / `httpx.ConnectError`，应用启动直接失败。请先打开 Ollama（Windows：开始菜单启动 Ollama，看托盘是否有图标），再启动 uvicorn。详见下文 **「Ollama 与 opinion-service 的启动顺序」**。

### 第一步：安装 Python

opinion-service 是 Python 项目，需要 Python 3.10 及以上版本。Node.js / pnpm 不能替代，两者是独立的运行环境。

**macOS**

macOS 自带的 Python 版本较旧，推荐用 Homebrew 安装：

```bash
# 如果还没有 Homebrew，先安装（官网：https://brew.sh）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Python 3
brew install python@3.12

# 验证安装
python3 --version   # 应输出 Python 3.12.x
```

**Windows**

前往 [python.org/downloads](https://www.python.org/downloads/) 下载安装包（选 3.12.x）。

安装时勾选 **"Add Python to PATH"**（非常重要，否则终端找不到 python 命令）。

安装后打开新的终端验证：

```bash
python --version    # 应输出 Python 3.12.x
```

---

### 第二步：安装 Ollama

Ollama 是本地运行 AI 模型的工具，用于将文本转换为向量。

前往 [ollama.com](https://ollama.com) 下载对应系统的安装包，安装后 Ollama 会在后台自动运行。

验证安装：

```bash
ollama --version
```

### Ollama 与 opinion-service 的启动顺序（重要）

1. **先 Ollama，后 opinion-service**  
   嵌入与知识库向量化都依赖 Ollama API。请**先**保证 Ollama 已在后台运行，**再**在同一台电脑上执行 `uvicorn main:app --port 8001`。

2. **重启电脑 / 只重启了终端或 uvicorn**  
   Ollama **不会**随你重启 opinion-service 而自动启动。电脑关机再开机后，一般需要**重新打开一次 Ollama 应用**（除非你在系统里为它设置了开机自启）。

3. **启动前自检（推荐）**  
   在启动 uvicorn 之前执行：

   ```bash
   ollama list
   ```

   能正常打印模型列表（含 `nomic-embed-text`）即表示本机 Ollama 已就绪。也可在浏览器访问 `http://127.0.0.1:11434` 做连通性检查。

4. **若仍报错连接被拒绝**
   - 确认没有其它程序占用或篡改 Ollama 端口；若使用自定义地址，请配置环境变量 `OLLAMA_HOST`（与官方文档一致），并保证 Python 客户端能访问同一地址。
   - 本仓库 `main.py` 已设置 `NO_PROXY`，避免 Clash 等代理把本地 Ollama 流量拐走；若 Nest/其它 Node 程序访问异常，也可在运行前设置 `NO_PROXY=127.0.0.1,localhost`。

---

### 第三步：拉取嵌入模型（只需一次，约 274MB）

```bash
ollama pull nomic-embed-text
```

拉取完成后验证：

```bash
ollama list
# 应能看到 nomic-embed-text 在列表中
```

---

### 第四步：首次启动服务

> 以下 **venv 与 pip** 步骤只需在**第一次**运行时执行；之后每次开发只要：**先开 Ollama → 激活 venv → 再 `uvicorn`**。

**macOS / Linux**

```bash
cd opinion-service
python3 -m venv .venv
source .venv/bin/activate         # 激活成功后终端提示符前会出现 (.venv)
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

**Windows（PowerShell，推荐）**

```powershell
cd E:\graduate-design\opinion-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # 激活成功后终端提示符前会出现 (.venv)
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

> Windows 如果用 cmd 不是 PowerShell：激活脚本是 `.venv\Scripts\activate.bat`。

看到以下输出说明启动成功：

```
[startup] 预热 Ollama 嵌入模型...
[embedder] Ollama warmup 完成
[startup] 加载知识库到 ChromaDB...
[knowledge_loader] irrelevant 集合加载完成，共 82 条示例
[knowledge_loader] relevant 集合加载完成，共 56 条示例
[knowledge_loader] support_a 集合加载完成，共 44 条示例
[knowledge_loader] support_b 集合加载完成，共 42 条示例
[startup] opinion-service 就绪
INFO:     Application startup complete.
```

> `Failed to send telemetry event ...` 这类警告是 ChromaDB 内部遥测上报失败，不影响任何功能，忽略即可。
> 若想彻底关掉这类提示，启动前在同一个终端先执行：
>
> - **macOS / Linux**：`export ANONYMIZED_TELEMETRY=False`
> - **Windows PowerShell**：`$env:ANONYMIZED_TELEMETRY = "False"`

启动后可访问 [http://localhost:8001/docs](http://localhost:8001/docs) 查看交互式接口文档；或快速健康检查：

```bash
curl http://127.0.0.1:8001/health    # 应返回 {"status":"ok"}
```

---

### 后续重新启动

虚拟环境和依赖已经装好，每次只需三步：

**macOS / Linux**

```bash
cd opinion-service
source .venv/bin/activate
uvicorn main:app --reload --port 8001
```

**Windows PowerShell**

```powershell
cd E:\graduate-design\opinion-service
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8001
```

> **提示**：关闭终端后，下次只要重新激活虚拟环境（`.venv` 目录还在，不必重装依赖）。

---

### Windows 特别说明：系统代理拦截

如果你本机开着 Clash / V2Ray / 其它系统代理（典型监听 `127.0.0.1:7890`），Python 的 `httpx` 默认会读 Windows 注册表里的 `ProxyServer` 而忽略 `ProxyOverride`，把发往 `127.0.0.1:11434` 的 Ollama 请求也代理走，结果拿到 **HTTP 502**。

`main.py` 顶部已经预先把 `NO_PROXY=127.0.0.1,localhost,::1` 写进了进程环境，**不需要你手动配置**，只要运行 `uvicorn main:app ...` 即可正常工作。

如果你不是用 `uvicorn main:app` 入口，而是直接 `import` 了 `embedder`、`memory_store` 等模块，请在你的入口最早的位置加上：

```python
import os
os.environ.setdefault("NO_PROXY", "127.0.0.1,localhost,::1")
os.environ.setdefault("no_proxy", "127.0.0.1,localhost,::1")
```

> 必须在 `import ollama` 之前设置。

---

### 启动时自动完成的事

每次启动服务时，会自动执行：

1. **设置 `NO_PROXY`**：`main.py` 顶部预先把 `127.0.0.1,localhost,::1` 写入进程环境，防止系统级代理（Clash/V2Ray 等）拦截本地 Ollama 请求
2. **Ollama 预热**：发一次 dummy 请求让模型加载进内存，消除第一条真实请求的冷启动延迟（约 2-5 秒）
3. **加载知识库**：将 `knowledge/` 下 4 个文件（`irrelevant` / `relevant` / `support_a` / `support_b`）写入 ChromaDB（幂等操作，重复启动不会重复写入）

接口文档（服务启动后可访问）：`http://localhost:8001/docs`

---

## 目录结构

```
opinion-service/
│
├── main.py                  # FastAPI 入口，定义全部 HTTP 接口
│
├── ── 基础设施 ──
├── embedder.py              # Ollama 嵌入封装，两层共用
├── chroma_store.py          # ChromaDB 读写封装，两层共用
│
├── ── 第三层：弹幕过滤 ──
├── relevance_checker.py     # 相关性检测（有效观点 vs 灌水）
├── stance_detector.py       # 立场识别（SUPPORT_A / SUPPORT_B / NEUTRAL）
├── deduplicator.py          # 语义去重（相似度 ≥ 0.85 合并）
├── knowledge_loader.py      # 服务启动时将 knowledge/ 写入 ChromaDB
├── knowledge/
│   ├── irrelevant.txt       # 灌水示例（哈哈/666/第一/纯表情等）
│   ├── relevant.txt         # 有效观点示例（各类风格均可）
│   ├── support_a.txt        # 支持 A 方的示例
│   └── support_b.txt        # 支持 B 方的示例
│
├── ── 第四层：情绪记忆 ──
├── memory_store.py          # 用户情绪记忆存取（每用户独立 ChromaDB 集合）
│
├── ── 数据与配置 ──
├── chroma_data/             # ChromaDB 持久化数据（自动生成，勿删，已加入 .gitignore）
├── requirements.txt         # Python 依赖
└── .venv/                   # 虚拟环境（自动生成，已加入 .gitignore）
```

---

## 接口说明

### 通用

| 方法 | 路径      | 说明                              |
| ---- | --------- | --------------------------------- |
| GET  | `/health` | 健康检查，返回 `{"status": "ok"}` |

### 第三层：弹幕过滤

| 方法 | 路径            | 说明                                         | 调用方                              |
| ---- | --------------- | -------------------------------------------- | ----------------------------------- |
| POST | `/process`      | 处理单条弹幕，返回 `isRelevant` + `stance`   | `rooms.gateway.ts` 弹幕实时处理     |
| POST | `/batch-filter` | 批量过滤，返回按立场分组的有效观点（已去重） | `debate.service.ts` 60 秒结束后兜底 |

**`/process` 请求/响应示例**：

```json
// 请求
{ "text": "我觉得A方说的更现实", "topic": "" }

// 响应
{ "isRelevant": true, "stance": "SUPPORT_A" }
```

**`/batch-filter` 响应示例**：

```json
{
  "forA": [{ "id": 1, "content": "...", "userId": 42 }],
  "forB": [],
  "neutral": [],
  "filteredCount": 3
}
```

### 第四层：情绪记忆

| 方法 | 路径               | 说明                             | 调用方                             |
| ---- | ------------------ | -------------------------------- | ---------------------------------- |
| POST | `/memories/add`    | 向量化会话摘要，存入用户专属集合 | `counseling.service.ts` 会话关闭后 |
| POST | `/memories/search` | 检索与当前话题最相关的历史摘要   | `counseling.service.ts` 预检索     |

**`/memories/add` 请求示例**：

```json
{
  "userId": 1,
  "sessionId": 42,
  "summary": "用户因考研焦虑，倾向被倾听而非获得建议",
  "date": "2026-04-25"
}
```

**`/memories/search` 请求/响应示例**：

```json
// 请求
{ "userId": 1, "query": "最近压力很大", "limit": 3 }

// 响应
{
  "memories": [
    { "summary": "用户因考研焦虑，倾向被倾听", "date": "2026-04-20", "sessionId": 38, "score": 0.91 },
    { "summary": "用户担心找工作，情绪低落", "date": "2026-04-15", "sessionId": 35, "score": 0.78 }
  ]
}
```

---

## ChromaDB 数据结构

每条记录由三个字段组成：

```
向量（embedding）  ← 由文本计算，用于相似度检索
文本（document）   ← 原始文本，检索命中后直接返回（第四层为摘要文本）
元数据（metadata） ← 附加信息（sessionId / date / userId 等）
```

**集合命名规则**：

| 集合名                   | 内容                 | 层次   |
| ------------------------ | -------------------- | ------ |
| `irrelevant`             | 灌水弹幕示例向量     | 第三层 |
| `relevant`               | 有效观点示例向量     | 第三层 |
| `user_{userId}_memories` | 用户历史会话摘要向量 | 第四层 |

---

## 降级行为

RAG 服务不可用时，NestJS 侧会自动降级，不影响主功能：

- **第三层**：弹幕全部视为有效观点（`isRelevant=true`），立场标记为 `NEUTRAL`
- **第四层**：共情师跳过历史记忆注入，仅使用当前会话上下文和情绪档案

---

## 依赖说明

| 包         | 版本  | 用途                              |
| ---------- | ----- | --------------------------------- |
| `fastapi`  | 0.115 | HTTP 服务框架                     |
| `uvicorn`  | 0.30  | ASGI 服务器                       |
| `chromadb` | 0.5   | 本地向量数据库                    |
| `ollama`   | 0.3   | Ollama Python 客户端              |
| `httpx`    | 0.27  | 异步 HTTP 客户端（chromadb 依赖） |
| `pydantic` | 2.9   | 数据校验                          |
