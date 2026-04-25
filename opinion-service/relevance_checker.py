"""
第三层 RAG：弹幕相关性检测。

逻辑：将弹幕向量与预构建的"灌水示例"集合做相似度比较。
相似度高（>= THRESHOLD）→ 灌水，过滤掉；相似度低 → 有效观点。
"""
import embedder
import chroma_store

IRRELEVANT_COLLECTION = "irrelevant"
RELEVANT_COLLECTION = "relevant"
IRRELEVANT_THRESHOLD = 0.65  # 与灌水示例相似度超过此值视为灌水
REPEAT_CHAR_RATIO = 0.6      # 单个字符占比超过此值视为重复刷屏灌水
MIN_LENGTH = 4               # 少于此字数直接视为灌水（纯表情/单字等）


def _is_spam_by_rule(text: str) -> bool:
    """规则兜底：捕获向量检索漏掉的重复字符、超短文本等明显灌水。"""
    t = text.strip()
    if len(t) < MIN_LENGTH:
        return True
    # 统计出现最多的字符占比
    if t:
        max_char_count = max(t.count(c) for c in set(t))
        if max_char_count / len(t) >= REPEAT_CHAR_RATIO:
            return True
    return False


def is_relevant(text: str) -> bool:
    """判断弹幕是否为有效观点（True=有效，False=灌水）。"""
    if _is_spam_by_rule(text):
        return False
    vec = embedder.embed(text)
    score = chroma_store.max_similarity(IRRELEVANT_COLLECTION, vec)
    return score < IRRELEVANT_THRESHOLD


def process(text: str) -> dict:
    """
    处理单条弹幕，返回相关性结果和向量（供 stance_detector 复用）。
    返回: { "isRelevant": bool, "embedding": list[float] }
    """
    if _is_spam_by_rule(text):
        vec = embedder.embed(text)
        return {"isRelevant": False, "embedding": vec}
    vec = embedder.embed(text)
    score = chroma_store.max_similarity(IRRELEVANT_COLLECTION, vec)
    return {
        "isRelevant": score < IRRELEVANT_THRESHOLD,
        "embedding": vec,
    }
