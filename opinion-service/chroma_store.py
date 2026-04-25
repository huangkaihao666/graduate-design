"""
ChromaDB 读写封装，两层 RAG 共用。

第三层集合：
  - "irrelevant"：灌水弹幕示例向量
  - "relevant"：有效观点示例向量

第四层集合（每用户独立）：
  - "user_{userId}_memories"：用户历史会话摘要向量
"""
import chromadb

_client = chromadb.PersistentClient(path="./chroma_data")


def get_collection(name: str):
    return _client.get_or_create_collection(name=name)


def upsert(collection_name: str, ids: list[str], embeddings: list[list[float]], documents: list[str], metadatas: list[dict] = None):
    col = get_collection(collection_name)
    kwargs = dict(ids=ids, embeddings=embeddings, documents=documents)
    # ChromaDB 要求 metadata 必须是非空 dict，无 metadata 时直接不传该参数
    if metadatas:
        kwargs["metadatas"] = metadatas
    col.upsert(**kwargs)


def query(collection_name: str, query_embedding: list[float], n_results: int = 5) -> dict:
    col = get_collection(collection_name)
    count = col.count()
    if count == 0:
        return {"documents": [[]], "distances": [[]], "metadatas": [[]]}
    actual_n = min(n_results, count)
    return col.query(
        query_embeddings=[query_embedding],
        n_results=actual_n,
        include=["documents", "distances", "metadatas"],
    )


def max_similarity(collection_name: str, query_embedding: list[float]) -> float:
    """返回 query 与集合中最相似文档的相似度（0~1，越高越相似）。"""
    result = query(collection_name, query_embedding, n_results=1)
    distances = result["distances"][0]
    if not distances:
        return 0.0
    # ChromaDB 默认使用平方 L2 距离，用 exp 衰减转换为 0~1 的相似度分数
    # dist=0 → score=1.0，dist越大 score 越趋近 0，便于直观理解
    dist = distances[0]
    import math
    return round(math.exp(-dist / 50), 4)


def collection_count(collection_name: str) -> int:
    return get_collection(collection_name).count()
