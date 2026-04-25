"""
第三层 RAG：语义去重。

对一批弹幕向量做贪心去重：
  - 按时间顺序遍历，若当前弹幕与已保留的任意弹幕相似度 >= THRESHOLD，则丢弃
  - 保留第一条（先来先得）
"""
import embedder

DEDUP_THRESHOLD = 0.85


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def deduplicate(opinions: list[dict]) -> list[dict]:
    """
    对观点列表做语义去重。
    每条 opinion 需包含 "content" 字段，可选包含 "embedding"（无则实时计算）。
    返回去重后的列表，保留原始字段。
    """
    kept: list[dict] = []
    kept_embeddings: list[list[float]] = []

    for op in opinions:
        vec = op.get("embedding") or embedder.embed(op["content"])
        is_dup = any(
            cosine_similarity(vec, kept_vec) >= DEDUP_THRESHOLD
            for kept_vec in kept_embeddings
        )
        if not is_dup:
            kept.append(op)
            kept_embeddings.append(vec)

    return kept
