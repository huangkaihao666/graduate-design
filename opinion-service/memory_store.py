"""
第四层 RAG：用户情绪记忆存取。

每个用户有独立的 ChromaDB 集合：user_{userId}_memories
集合中每条记录：
  - document: 摘要文本（如"用户因考研焦虑，倾向被倾听"），检索命中后直接拼入 prompt
  - embedding: 由摘要文本计算的向量，用于相似度检索
  - metadata: { sessionId, date }
"""
import embedder
import chroma_store


def collection_name(user_id: int) -> str:
    return f"user_{user_id}_memories"


def add_memory(user_id: int, session_id: int, summary: str, date: str):
    """向量化摘要并存入用户专属集合。"""
    col = collection_name(user_id)
    vec = embedder.embed(summary)
    chroma_store.upsert(
        collection_name=col,
        ids=[f"session_{session_id}"],
        embeddings=[vec],
        documents=[summary],
        metadatas=[{"sessionId": session_id, "date": date}],
    )


def search_memories(user_id: int, query_text: str, limit: int = 3) -> list[dict]:
    """
    以 query_text 为检索词，返回最相关的历史摘要列表。
    返回格式: [{ "summary": str, "date": str, "sessionId": int, "score": float }]
    """
    col = collection_name(user_id)
    if chroma_store.collection_count(col) == 0:
        return []

    vec = embedder.embed(query_text)
    result = chroma_store.query(col, vec, n_results=limit)

    memories = []
    docs = result["documents"][0]
    metas = result["metadatas"][0]
    dists = result["distances"][0]

    for doc, meta, dist in zip(docs, metas, dists):
        import math
        score = round(math.exp(-dist / 50), 4)
        memories.append({
            "summary": doc,
            "date": meta.get("date", ""),
            "sessionId": meta.get("sessionId", 0),
            "score": round(score, 4),
        })

    return memories
