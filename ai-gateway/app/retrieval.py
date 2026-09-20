"""Official Samsung Deeplink retrieval engine using lexical TF-IDF cosine similarity.

Indexes the official 578-entry catalog from data/deeplinks.json and matches
troubleshooting step descriptions against actionable & validation URIs.
"""
import math
import re
from typing import Any, Dict, List, Optional, Tuple

from .data_loader import load_deeplinks
from .models import Deeplink, ValidationDeepLink


def _tokenize(text: str) -> List[str]:
    return [w.lower() for w in re.findall(r"\w+", text) if len(w) > 1]


def _compute_tf_idf_vectors(documents: List[str]) -> Tuple[List[Dict[str, float]], Dict[str, float]]:
    num_docs = len(documents)
    doc_tokens = [_tokenize(doc) for doc in documents]
    df: Dict[str, int] = {}
    for tokens in doc_tokens:
        unique_tokens = set(tokens)
        for t in unique_tokens:
            df[t] = df.get(t, 0) + 1

    idf: Dict[str, float] = {t: math.log((num_docs + 1) / (count + 1)) + 1.0 for t, count in df.items()}

    vectors: List[Dict[str, float]] = []
    for tokens in doc_tokens:
        tf: Dict[str, int] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        vec: Dict[str, float] = {}
        norm_sq = 0.0
        for t, count in tf.items():
            val = count * idf.get(t, 1.0)
            vec[t] = val
            norm_sq += val * val
        norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
        normalized_vec = {t: v / norm for t, v in vec.items()}
        vectors.append(normalized_vec)

    return vectors, idf


class DeeplinkRetriever:
    """Lexical TF-IDF cosine similarity retrieval index for official Samsung deeplinks."""

    def __init__(self, data_dir: Optional[Any] = None):
        raw_data = load_deeplinks(data_dir)
        self.catalog: List[Dict[str, Any]] = raw_data.get("deeplinks", [])
        self.doc_texts: List[str] = []
        for item in self.catalog:
            desc = item.get("description", "")
            msg = item.get("message", "")
            qna = item.get("qna_description", "")
            combined = f"{msg} {desc} {qna}"
            self.doc_texts.append(combined)

        self.vectors, self.idf = _compute_tf_idf_vectors(self.doc_texts)

    def search(
        self, query: str, threshold: float = 0.22
    ) -> Optional[Tuple[Deeplink, Optional[ValidationDeepLink], float]]:
        """Search top matching official deeplink for a step description.

        Returns (actionable_deeplink, validation_deeplink, similarity_score) if score >= threshold, else None.
        """
        query_tokens = _tokenize(query)
        if not query_tokens:
            return None

        q_tf: Dict[str, int] = {}
        for t in query_tokens:
            q_tf[t] = q_tf.get(t, 0) + 1

        q_vec: Dict[str, float] = {}
        norm_sq = 0.0
        for t, count in q_tf.items():
            val = count * self.idf.get(t, 1.0)
            q_vec[t] = val
            norm_sq += val * val
        norm = math.sqrt(norm_sq) if norm_sq > 0 else 1.0
        q_norm_vec = {t: v / norm for t, v in q_vec.items()}

        best_score = 0.0
        best_index = -1

        for idx, doc_vec in enumerate(self.vectors):
            score = 0.0
            for t, val in q_norm_vec.items():
                if t in doc_vec:
                    score += val * doc_vec[t]
            if score > best_score:
                best_score = score
                best_index = idx

        if best_index >= 0 and best_score >= threshold:
            raw_item = self.catalog[best_index]
            act_dl = Deeplink(
                deeplink=raw_item.get("deeplink", ""),
                description=raw_item.get("description", ""),
                message=raw_item.get("message", ""),
                classes=raw_item.get("classes"),
                originalType=raw_item.get("originalType"),
            )
            val_dl = None
            if raw_item.get("validation") and isinstance(raw_item["validation"], dict):
                v_data = raw_item["validation"]
                if v_data.get("deeplink") and v_data.get("key"):
                    val_dl = ValidationDeepLink(
                        deeplink=v_data["deeplink"],
                        key=v_data["key"],
                        resultType=v_data.get("resultType"),
                        condition=v_data.get("condition"),
                        value=v_data.get("value"),
                    )
            return act_dl, val_dl, round(best_score, 4)

        return None


_retriever: Optional[DeeplinkRetriever] = None


def get_retriever() -> DeeplinkRetriever:
    global _retriever
    if _retriever is None:
        _retriever = DeeplinkRetriever()
    return _retriever
