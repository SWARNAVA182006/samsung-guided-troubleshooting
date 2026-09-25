"""Temporary analysis script for retrieval quality inspection."""
import sys
import math
import re
sys.path.insert(0, 'ai-gateway')
from app.retrieval import DeeplinkRetriever

r = DeeplinkRetriever()


def tokenize(text):
    return [w.lower() for w in re.findall(r'\w+', text) if len(w) > 1]


def top_candidates(query, n=10):
    query_tokens = tokenize(query)
    q_tf = {}
    for t in query_tokens:
        q_tf[t] = q_tf.get(t, 0) + 1
    q_vec = {}
    norm_sq = 0.0
    for t, count in q_tf.items():
        val = count * r.idf.get(t, 1.0)
        q_vec[t] = val
        norm_sq += val * val
    norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
    q_norm_vec = {t: v / norm for t, v in q_vec.items()}

    scores = []
    for idx, doc_vec in enumerate(r.vectors):
        score = sum(q_norm_vec.get(t, 0) * v for t, v in doc_vec.items() if t in q_norm_vec)
        scores.append((score, idx))
    scores.sort(reverse=True)

    print(f'\nTop {n} for: "{query}"')
    for score, idx in scores[:n]:
        item = r.catalog[idx]
        dl = item.get("deeplink", "")
        desc = item.get("description", "")[:70]
        msg = item.get("message", "")[:50]
        orig = item.get("originalType", "")
        print(f'  Score:{score:.4f} | {dl} | {desc}')
        print(f'           message={msg} | type={orig}')


queries = [
    "screen flickering",
    "display flickering fix brightness",
    "touch sensitivity screen touch",
    "battery drain fast",
    "wifi disconnecting",
    "bluetooth pairing failed",
    "camera app crash",
    "NFC payment",
    "fingerprint unlock not working",
]

for q in queries:
    top_candidates(q, 5)
