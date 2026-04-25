"""
Ollama 向量嵌入封装，两层 RAG 共用。
模型：nomic-embed-text（274MB，纯 CPU 可运行）
"""
import ollama

EMBED_MODEL = "nomic-embed-text"


def embed(text: str) -> list[float]:
    """将文本转换为向量。"""
    response = ollama.embeddings(model=EMBED_MODEL, prompt=text)
    return response["embedding"]


def warmup():
    """服务启动时预热，避免第一条请求触发 Ollama 冷启动延迟。"""
    try:
        embed("warmup")
        print("[embedder] Ollama warmup 完成")
    except Exception as e:
        print(f"[embedder] Ollama warmup 失败，请确认 Ollama 已启动: {e}")
