"""
第三层 RAG：弹幕立场识别。

策略：
  - 将弹幕向量分别与 "support_a" 和 "support_b" 集合做相似度比较
  - 两者相差 > DIFF_THRESHOLD 时取较高的一方
  - 否则判定为 NEUTRAL
  - 若两个集合均为空（知识库未初始化），回退到关键词规则
"""
import chroma_store

SUPPORT_A_COLLECTION = "support_a"
SUPPORT_B_COLLECTION = "support_b"
DIFF_THRESHOLD = 0.05  # 两方相似度差值超过此值才判定立场


def detect(embedding: list[float]) -> str:
    """
    根据已有向量判断立场。
    返回: "SUPPORT_A" | "SUPPORT_B" | "NEUTRAL"
    """
    count_a = chroma_store.collection_count(SUPPORT_A_COLLECTION)
    count_b = chroma_store.collection_count(SUPPORT_B_COLLECTION)

    # 知识库未初始化时返回 NEUTRAL
    if count_a == 0 and count_b == 0:
        return "NEUTRAL"

    score_a = chroma_store.max_similarity(SUPPORT_A_COLLECTION, embedding) if count_a > 0 else 0.0
    score_b = chroma_store.max_similarity(SUPPORT_B_COLLECTION, embedding) if count_b > 0 else 0.0

    diff = abs(score_a - score_b)
    if diff < DIFF_THRESHOLD:
        return "NEUTRAL"
    return "SUPPORT_A" if score_a > score_b else "SUPPORT_B"
