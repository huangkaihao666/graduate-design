"""
服务启动时将 knowledge/ 目录下的示例写入 ChromaDB。
幂等操作：已存在的记录直接 upsert 覆盖。
"""
import embedder
import chroma_store
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"


def load_knowledge():
    """将 irrelevant.txt 和 relevant.txt 写入对应的 ChromaDB 集合。"""
    for filename, collection in [
        ("irrelevant.txt", "irrelevant"),
        ("relevant.txt", "relevant"),
    ]:
        filepath = KNOWLEDGE_DIR / filename
        if not filepath.exists():
            print(f"[knowledge_loader] 跳过 {filename}（文件不存在）")
            continue

        lines = [
            line.strip()
            for line in filepath.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]

        if not lines:
            continue

        ids = [f"{collection}_{i}" for i in range(len(lines))]
        embeddings = [embedder.embed(line) for line in lines]

        chroma_store.upsert(
            collection_name=collection,
            ids=ids,
            embeddings=embeddings,
            documents=lines,
        )
        print(f"[knowledge_loader] {collection} 集合加载完成，共 {len(lines)} 条示例")
