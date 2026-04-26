"""
第三层 RAG：弹幕立场识别。

策略（双轨）：
  主轨（动态语义）：将弹幕向量与"支持A方锚点"和"支持B方锚点"做相似度比较。
    锚点由辩题 + 智能体名字实时生成，每场辩论不同，能识别"支持毒舌现实主义者"这类表述。
  兜底（静态知识库）：若动态锚点不可用，回退到 support_a / support_b 集合。
  两方相似度差值 > DIFF_THRESHOLD 才判定立场，否则 NEUTRAL。
"""
from typing import Optional
import embedder

SUPPORT_A_COLLECTION = "support_a"
SUPPORT_B_COLLECTION = "support_b"
DIFF_THRESHOLD = 0.05  # 差值阈值，越小越容易判出立场，越大越保守

# 内存缓存：topic -> (vec_a, vec_b)，避免同一场辩论反复嵌入
_anchor_cache: dict[str, tuple[list[float], list[float]]] = {}


def _get_anchors(topic: str, agent_a_name: str, agent_b_name: str) -> tuple[list[float], list[float]]:
    """
    为本场辩论生成两个立场锚点向量。
    用多句话拼成段落再嵌入，比单句锚点覆盖更多表达方式，区分度更高。
    """
    cache_key = f"{topic}||{agent_a_name}||{agent_b_name}"
    if cache_key in _anchor_cache:
        return _anchor_cache[cache_key]

    # 锚点融合两层语义：
    # 1. 直接提名（"我支持毒舌现实主义者"）
    # 2. 辩题正方立场（"应该这样做"）vs 反方立场（"不应该这样做"）
    # 两层叠加让锚点覆盖"点名支持"和"含义支持"两种表达
    anchor_a = (
        f"我支持{agent_a_name}。"
        f"我赞同{agent_a_name}的观点，{agent_a_name}说得对。"
        f"站{agent_a_name}这边，{agent_a_name}的立场更有道理。"
        f"关于{topic}，我认为{agent_a_name}说的是对的。"
        f"同意{agent_a_name}，支持{agent_a_name}的主张。"
    )
    anchor_b = (
        f"我支持{agent_b_name}。"
        f"我赞同{agent_b_name}的观点，{agent_b_name}说得对。"
        f"站{agent_b_name}这边，{agent_b_name}的立场更有道理。"
        f"关于{topic}，我认为{agent_b_name}说的是对的。"
        f"同意{agent_b_name}，支持{agent_b_name}的主张。"
    )

    vec_a = embedder.embed(anchor_a)
    vec_b = embedder.embed(anchor_b)
    _anchor_cache[cache_key] = (vec_a, vec_b)
    return vec_a, vec_b


def _cosine_sim(a: list[float], b: list[float]) -> float:
    """计算两个向量的余弦相似度（0~1）。"""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return round(dot / (norm_a * norm_b), 4)


_SUPPORT_KEYWORDS = ["支持", "赞同", "同意", "站", "认为.*对", "觉得.*对", "说得对", "说的对", "有道理"]
_OPPOSE_KEYWORDS  = ["反对", "不支持", "不赞同", "不同意", "不认为"]

# 名字至少匹配几个字才算命中（防止单字误匹配）
_MIN_FRAGMENT_LEN = 2


def _name_fragments(name: str) -> list[str]:
    """
    从智能体全名中提取所有长度 >= _MIN_FRAGMENT_LEN 的连续子串，
    按长度降序排列（优先匹配更长的片段，减少误匹配）。
    例：「毒舌现实主义者」→ ['毒舌现实主义者','毒舌现实主义','现实主义者','毒舌现实','现实主义','毒舌','现实','主义','主义者',...]
    """
    frags = set()
    n = len(name)
    for start in range(n):
        for end in range(start + _MIN_FRAGMENT_LEN, n + 1):
            frags.add(name[start:end])
    return sorted(frags, key=len, reverse=True)


def _mentions_agent(text: str, name: str) -> bool:
    """判断 text 是否提到了 name 的任意片段（模糊匹配）。"""
    for frag in _name_fragments(name):
        if frag in text:
            return True
    return False


def _keyword_stance(text: str, agent_a_name: str, agent_b_name: str) -> Optional[str]:
    """
    关键词前置判断：若文本提到智能体名字的任意片段 + 支持/反对词，直接返回立场。
    支持「毒舌」「现实主义」「温柔」「共情者」等不完整写法。
    返回 None 表示无法判断，交给向量检索。
    """
    import re
    support_pat = re.compile("|".join(_SUPPORT_KEYWORDS))
    oppose_pat  = re.compile("|".join(_OPPOSE_KEYWORDS))

    has_support = bool(support_pat.search(text))
    has_oppose  = bool(oppose_pat.search(text))
    has_a = agent_a_name and _mentions_agent(text, agent_a_name)
    has_b = agent_b_name and _mentions_agent(text, agent_b_name)

    # 两个名字都命中时不做判断，交给向量（避免"毒舌不如温柔"这类被误判）
    if has_a and not has_b:
        if has_support: return "SUPPORT_A"
        if has_oppose:  return "SUPPORT_B"
    if has_b and not has_a:
        if has_support: return "SUPPORT_B"
        if has_oppose:  return "SUPPORT_A"
    return None


def detect(embedding: list[float], topic: str = "", agent_a_name: str = "", agent_b_name: str = "", text: str = "") -> str:
    """
    根据弹幕向量（+原文）判断立场，双轨策略：
    1. 关键词前置：文本含名字 + 支持/反对词时直接判定，快速且准确
    2. 动态语义锚点：基于智能体名字生成锚点向量做余弦相似度比较
    返回: "SUPPORT_A" | "SUPPORT_B" | "NEUTRAL"
    """
    if not (topic and agent_a_name and agent_b_name):
        return "NEUTRAL"

    # 第一轨：关键词规则（高精度，优先）
    if text:
        kw_result = _keyword_stance(text, agent_a_name, agent_b_name)
        if kw_result is not None:
            return kw_result

    # 第二轨：动态语义锚点
    vec_a, vec_b = _get_anchors(topic, agent_a_name, agent_b_name)
    score_a = _cosine_sim(embedding, vec_a)
    score_b = _cosine_sim(embedding, vec_b)
    diff = abs(score_a - score_b)
    if diff < DIFF_THRESHOLD:
        return "NEUTRAL"
    return "SUPPORT_A" if score_a > score_b else "SUPPORT_B"
