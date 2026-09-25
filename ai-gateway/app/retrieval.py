"""Official Samsung Deeplink retrieval engine using lexical TF-IDF cosine similarity.

Indexes the official 578-entry catalog from data/deeplinks.json and matches
troubleshooting step descriptions against actionable & validation URIs.

Retrieval method: TF-IDF cosine similarity (custom, no ML dependencies).
Each catalog entry is indexed using its description + message + qna_description + originalType.

For each query, the document text is enriched with additional troubleshooting-domain
context terms derived from the query's topic keywords to reduce purely lexical
false-positive matches (e.g. "screen flickering" should not match "screen split view").

No ground-truth relevance labels are available; the threshold=0.22 was chosen
empirically as a point where candidate retrieval rates are acceptable. It is
NOT a proven optimal threshold.
"""
import math
import re
from typing import Any, Dict, List, Optional, Tuple

from .data_loader import load_deeplinks
from .models import Deeplink, ValidationDeepLink


# Domain-specific synonym/expansion map.
# Maps high-level troubleshooting intent keywords to catalog-relevant terms.
# This improves recall for cases where the query uses colloquial language
# that doesn't lexically overlap with the catalog description.
_DOMAIN_EXPANSIONS: Dict[str, List[str]] = {
    "flicker": ["brightness", "adaptive", "display", "motion", "smoothness", "refresh"],
    "flickering": ["brightness", "adaptive", "display", "motion", "smoothness", "refresh"],
    "flickers": ["brightness", "adaptive", "display", "refresh"],
    "blank": ["power", "restart", "display", "brightness"],
    "freeze": ["app", "force", "stop", "clear", "cache"],
    "frozen": ["app", "force", "stop", "clear", "cache"],
    "crash": ["force", "stop", "clear", "cache", "storage"],
    "crashes": ["force", "stop", "clear", "cache", "storage"],
    "charge": ["charging", "battery", "cable", "adapter"],
    "charging": ["battery", "cable", "wireless", "fast", "power"],
    "drain": ["battery", "power", "saving", "usage"],
    "slow": ["performance", "storage", "ram", "background", "apps"],
    "lag": ["performance", "storage", "ram", "background"],
    "laggy": ["performance", "storage", "ram"],
    "disconnecting": ["wifi", "network", "connection", "settings"],
    "pairing": ["bluetooth", "pair", "device", "connection"],
    "overheat": ["battery", "temperature", "performance", "background"],
    "overheating": ["battery", "temperature", "performance"],
    "touch": ["sensitivity", "interaction", "screen", "display"],
    "fingerprint": ["biometric", "security", "unlock", "recognition"],
    "sound": ["volume", "speaker", "audio", "notification"],
    "audio": ["volume", "sound", "speaker", "media"],
    "speaker": ["volume", "sound", "audio", "media"],
    "notification": ["sound", "alert", "vibration", "dnd"],
    "brightness": ["display", "adaptive", "screen", "level"],
}

# Stopwords for TF-IDF tokenization
_STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for",
    "it", "is", "are", "was", "were", "of", "with", "this", "that",
    "my", "i", "me", "via", "device", "settings", "page",
}


def _tokenize(text: str) -> List[str]:
    return [w.lower() for w in re.findall(r"\w+", text) if len(w) > 1]


def _expand_query_tokens(tokens: List[str]) -> List[str]:
    """Add domain synonym tokens to improve retrieval recall without introducing noise."""
    expanded = list(tokens)
    for t in tokens:
        extras = _DOMAIN_EXPANSIONS.get(t, [])
        expanded.extend(extras)
    return expanded


def _compute_tf_idf_vectors(documents: List[str]) -> Tuple[List[Dict[str, float]], Dict[str, float]]:
    num_docs = len(documents)
    doc_tokens = [_tokenize(doc) for doc in documents]
    df: Dict[str, int] = {}
    for tokens in doc_tokens:
        unique_tokens = set(tokens)
        for t in unique_tokens:
            df[t] = df.get(t, 0) + 1

    idf: Dict[str, float] = {
        t: math.log((num_docs + 1) / (count + 1)) + 1.0
        for t, count in df.items()
    }

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
    """Lexical TF-IDF cosine similarity retrieval index for official Samsung deeplinks.

    Implementation notes:
    - Pure Python TF-IDF, no ML or external dependencies.
    - Indexes 578 official catalog entries from data/deeplinks.json.
    - Each catalog entry text = description + message + qna_description + originalType.
    - Query expansion via domain synonym map improves recall for colloquial terms.
    - Threshold 0.22 was observed empirically; no ground-truth labels are available.
    """

    def __init__(self, data_dir: Optional[Any] = None):
        raw_data = load_deeplinks(data_dir)
        self.catalog: List[Dict[str, Any]] = raw_data.get("deeplinks", [])
        self.doc_texts: List[str] = []
        for item in self.catalog:
            desc = item.get("description", "")
            msg = item.get("message", "")
            qna = item.get("qna_description", "")
            orig_type = item.get("originalType", "")
            combined = f"{msg} {desc} {qna} {orig_type}"
            self.doc_texts.append(combined)

        self.vectors, self.idf = _compute_tf_idf_vectors(self.doc_texts)

    def search(
        self, query: str, threshold: float = 0.22
    ) -> Optional[Tuple[Deeplink, Optional[ValidationDeepLink], float]]:
        """Search top matching official deeplink for a step description.

        Query tokens are expanded with domain synonyms before scoring.
        Returns (actionable_deeplink, validation_deeplink, similarity_score)
        if score >= threshold, else None.

        The returned score is a raw TF-IDF cosine similarity value in [0, 1].
        It is NOT a calibrated confidence or accuracy probability.
        """
        base_tokens = _tokenize(query)
        if not base_tokens:
            return None

        # Expand query with domain synonyms
        expanded_tokens = _expand_query_tokens(base_tokens)

        q_tf: Dict[str, int] = {}
        for t in expanded_tokens:
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
