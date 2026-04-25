"""
opinion-service FastAPI 入口

服务两层本地 RAG：
  第三层（静态）：弹幕过滤 + 立场识别，供辩论室使用
  第四层（动态）：用户情绪记忆存取，供 AI 共情师使用

启动：uvicorn main:app --reload --port 8001
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import embedder
import knowledge_loader
import relevance_checker
import stance_detector
import deduplicator
import memory_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时：预热 Ollama + 加载知识库
    print("[startup] 预热 Ollama 嵌入模型...")
    embedder.warmup()
    print("[startup] 加载知识库到 ChromaDB...")
    knowledge_loader.load_knowledge()
    print("[startup] opinion-service 就绪")
    yield


app = FastAPI(title="opinion-service", lifespan=lifespan)


# ─── 健康检查 ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ─── 第三层：弹幕过滤接口 ─────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    text: str
    topic: str = ""  # 辩论主题（预留，当前未使用）


class ProcessResponse(BaseModel):
    isRelevant: bool
    stance: str  # SUPPORT_A | SUPPORT_B | NEUTRAL


@app.post("/process", response_model=ProcessResponse)
def process_opinion(req: ProcessRequest):
    """处理单条弹幕，返回相关性 + 立场。"""
    if not req.text.strip():
        return ProcessResponse(isRelevant=False, stance="NEUTRAL")

    result = relevance_checker.process(req.text)
    stance = "NEUTRAL"
    if result["isRelevant"]:
        stance = stance_detector.detect(result["embedding"])

    return ProcessResponse(isRelevant=result["isRelevant"], stance=stance)


class OpinionItem(BaseModel):
    id: int
    content: str
    userId: int


class BatchFilterRequest(BaseModel):
    opinions: list[OpinionItem]
    topic: str = ""


class BatchFilterResponse(BaseModel):
    forA: list[OpinionItem]     # 支持 A 方的有效观点（去重后，最多5条）
    forB: list[OpinionItem]     # 支持 B 方的有效观点（去重后，最多5条）
    neutral: list[OpinionItem]  # 中立有效观点（去重后，最多3条）
    filteredCount: int          # 被过滤的灌水数量


@app.post("/batch-filter", response_model=BatchFilterResponse)
def batch_filter(req: BatchFilterRequest):
    """批量处理弹幕，返回按立场分组的有效观点（已语义去重）。"""
    valid_with_meta: list[dict] = []
    filtered_count = 0

    for op in req.opinions:
        result = relevance_checker.process(op.content)
        if not result["isRelevant"]:
            filtered_count += 1
            continue
        stance = stance_detector.detect(result["embedding"])
        valid_with_meta.append({
            "id": op.id,
            "content": op.content,
            "userId": op.userId,
            "stance": stance,
            "embedding": result["embedding"],
        })

    # 语义去重（整体去重，避免同义观点跨立场重复）
    deduped = deduplicator.deduplicate(valid_with_meta)

    def to_item(d: dict) -> OpinionItem:
        return OpinionItem(id=d["id"], content=d["content"], userId=d["userId"])

    for_a = [to_item(d) for d in deduped if d["stance"] == "SUPPORT_A"][:5]
    for_b = [to_item(d) for d in deduped if d["stance"] == "SUPPORT_B"][:5]
    neutral = [to_item(d) for d in deduped if d["stance"] == "NEUTRAL"][:3]

    return BatchFilterResponse(
        forA=for_a,
        forB=for_b,
        neutral=neutral,
        filteredCount=filtered_count,
    )


# ─── 第四层：情绪记忆接口 ─────────────────────────────────────────────────────

class AddMemoryRequest(BaseModel):
    userId: int
    sessionId: int
    summary: str   # 会话摘要文本，如"用户因考研焦虑，倾向被倾听"
    date: str      # 日期字符串，如"2026-04-25"


@app.post("/memories/add")
def add_memory(req: AddMemoryRequest):
    """向量化会话摘要，存入用户专属 ChromaDB 集合。"""
    if not req.summary.strip():
        raise HTTPException(status_code=400, detail="summary 不能为空")
    memory_store.add_memory(req.userId, req.sessionId, req.summary, req.date)
    return {"success": True}


class SearchMemoriesRequest(BaseModel):
    userId: int
    query: str    # 以用户当前输入文本作为检索词
    limit: int = 3


class MemoryItem(BaseModel):
    summary: str
    date: str
    sessionId: int
    score: float


class SearchMemoriesResponse(BaseModel):
    memories: list[MemoryItem]


@app.post("/memories/search", response_model=SearchMemoriesResponse)
def search_memories(req: SearchMemoriesRequest):
    """检索与当前话题最相关的历史摘要，直接返回摘要文本供 NestJS 拼入 prompt。"""
    if not req.query.strip():
        return SearchMemoriesResponse(memories=[])
    results = memory_store.search_memories(req.userId, req.query, req.limit)
    return SearchMemoriesResponse(
        memories=[MemoryItem(**r) for r in results]
    )
