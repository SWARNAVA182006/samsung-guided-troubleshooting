"""Grounded troubleshooting generation & deterministic schema normalization pipeline."""
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from dotenv import load_dotenv
import httpx

_ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
if _ROOT_ENV.exists():
    load_dotenv(_ROOT_ENV)
else:
    load_dotenv()

from .models import (
    Action,
    ContextDeeplinkResponse,
    Goal,
    StepGroup,
    TroubleshootRequest,
    actionCategory,
)
from .retrieval import get_retriever

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# Models that Gemini redirects to for new API keys (same behavior)
_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-flash-latest"]


STOPWORDS: Set[str] = {
    "i", "my", "me", "the", "a", "an", "is", "are", "was", "were", "and",
    "or", "in", "on", "at", "to", "for", "it", "when", "then", "of", "with", "this", "that"
}


def _content_tokens(text: str) -> Set[str]:
    words = [w.lower() for w in re.findall(r"\w+", text)]
    filtered = {w for w in words if w not in STOPWORDS and len(w) > 1}
    return filtered if filtered else set(words)


def _sanitize_no_urls(text: str) -> str:
    """Strip any external URLs, URIs, or domain links that might leak from generative models."""
    cleaned = re.sub(r"https?://\S+", "", text)
    cleaned = re.sub(r"ftp://\S+", "", cleaned)
    cleaned = re.sub(r"www\.\S+", "", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", cleaned)
    return cleaned.strip()


class TroubleshootingCache:
    """In-memory cache supporting exact query match and paraphrased query retrieval.

    Identifies entries using (siis_title, content_sha256).
    For paraphrase matching: computes content-word Jaccard similarity across token sets.
    Threshold for paraphrase hit: 0.50 within identical SIIS knowledge context.
    """

    def __init__(self, max_size: int = 256):
        self.max_size = max_size
        self._exact_store: Dict[str, Tuple[ContextDeeplinkResponse, float]] = {}
        self._entries: List[Dict[str, Any]] = []

    def _hash_siis(self, content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def _exact_key(self, query: str, title: str, siis_hash: str) -> str:
        norm_q = " ".join(re.findall(r"\w+", query.lower()))
        return f"{title}|{siis_hash}|{norm_q}"

    def get(
        self, query: str, title: str, content: str
    ) -> Optional[Tuple[ContextDeeplinkResponse, str, float]]:
        """Lookup cache. Returns (response, hit_type, similarity) or None."""
        siis_hash = self._hash_siis(content)
        key = self._exact_key(query, title, siis_hash)
        if key in self._exact_store:
            resp, _ = self._exact_store[key]
            return resp, "exact", 1.0

        # Paraphrase check within the exact same SIIS knowledge article
        q_tokens = _content_tokens(query)
        if not q_tokens:
            return None

        best_sim = 0.0
        best_resp: Optional[ContextDeeplinkResponse] = None

        for entry in reversed(self._entries):
            if entry["title"] == title and entry["siis_hash"] == siis_hash:
                entry_tokens = entry["tokens"]
                intersection = len(q_tokens & entry_tokens)
                union = len(q_tokens | entry_tokens)
                sim = intersection / union if union > 0 else 0.0
                if sim > best_sim:
                    best_sim = sim
                    best_resp = entry["response"]

        if best_resp is not None and best_sim >= 0.50:
            return best_resp, "paraphrase", round(best_sim, 4)

        return None

    def put(
        self, query: str, title: str, content: str, response: ContextDeeplinkResponse
    ) -> None:
        siis_hash = self._hash_siis(content)
        key = self._exact_key(query, title, siis_hash)
        self._exact_store[key] = (response, time.time())

        tokens = _content_tokens(query)
        self._entries.append(
            {
                "key": key,
                "title": title,
                "siis_hash": siis_hash,
                "tokens": tokens,
                "response": response,
                "timestamp": time.time(),
            }
        )

        if len(self._entries) > self.max_size:
            oldest = self._entries.pop(0)
            self._exact_store.pop(oldest["key"], None)

    def clear(self) -> None:
        self._exact_store.clear()
        self._entries.clear()


_cache = TroubleshootingCache()


def get_cache() -> TroubleshootingCache:
    return _cache


def _extract_steps_from_siis_content(content: str) -> List[Tuple[str, List[str]]]:
    """Fallback deterministic parser to extract section headers and bullet/numbered steps from SIIS text."""
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    sections: List[Tuple[str, List[str]]] = []
    current_section_title = "Troubleshooting Steps"
    current_steps: List[str] = []

    for line in lines:
        if line.startswith("#"):
            if current_steps:
                sections.append((current_section_title, current_steps))
                current_steps = []
            current_section_title = line.lstrip("#").strip()
        elif re.match(r"^(\d+[\.\)]|[\-\*])\s+", line) or len(line) > 15:
            step_text = re.sub(r"^(\d+[\.\)]|[\-\*])\s+", "", line).strip()
            if step_text:
                current_steps.append(_sanitize_no_urls(step_text))

    if current_steps:
        sections.append((current_section_title, current_steps))

    if not sections:
        sections = [
            (
                "General Diagnostics",
                [lines[0] if lines else "Follow device diagnostic instructions."],
            )
        ]

    return sections


async def generate_troubleshooting_with_timing(
    request: TroubleshootRequest,
    use_cache: bool = True,
) -> Tuple[ContextDeeplinkResponse, float, float, Dict[str, Any]]:
    """Execute grounded pipeline and return (response, local_pipeline_latency_ms, gemini_api_latency_ms, execution_meta)."""
    local_start = time.time()
    cache = get_cache()

    if use_cache:
        cached = cache.get(
            request.query, request.siis_response.title, request.siis_response.content
        )
        if cached:
            cached_resp, hit_type, hit_score = cached
            lookup_lat = round((time.time() - local_start) * 1000, 2)
            meta = {
                "cache_hit": True,
                "cache_type": hit_type,
                "cache_similarity": hit_score,
                "gemini_called": False,
                "gemini_succeeded": False,
                "deterministic_fallback_used": False,
            }
            return cached_resp, lookup_lat, 0.0, meta

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    raw_goal_data: Optional[Dict[str, Any]] = None
    gemini_latency_ms = 0.0
    gemini_called = False
    gemini_succeeded = False

    if api_key:
        gemini_called = True
        prompt = (
            "You are a Samsung Guided Troubleshooting AI engine.\n"
            f"User Complaint: {request.query}\n"
            f"SIIS Article Title: {request.siis_response.title}\n"
            f"SIIS Article Content:\n{request.siis_response.content}\n\n"
            "Task: Extract step-by-step diagnostic actions grounded strictly in the provided SIIS text.\n"
            "Rules:\n"
            "1. Ground all steps strictly in the SIIS text. Do NOT invent steps or external URLs.\n"
            "2. Group steps into logical action groups.\n"
            "3. Assign category 'auto', 'manual', or 'critical' for each action.\n"
            "4. Return strict JSON with format:\n"
            "{\n"
            '  "goal": "Follow these steps to perform troubleshooting",\n'
            '  "title": "Article Short Title",\n'
            '  "actions": [\n'
            "    {\n"
            '      "actionName": "Action Name",\n'
            '      "description": "Description of action",\n'
            '      "category": "manual",\n'
            '      "stepGroups": [\n'
            '        {"steps": ["Step 1...", "Step 2..."]}\n'
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        url = f"{GEMINI_API_URL}?key={api_key}"
        gemini_start = time.time()
        # Try primary model; if 404 (deprecated), try fallback models
        models_to_try = [GEMINI_MODEL] + _FALLBACK_MODELS
        for model_name in models_to_try:
            api_url_attempt = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            url_attempt = f"{api_url_attempt}?key={api_key}"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url_attempt, json=payload)
                    gemini_latency_ms = round((time.time() - gemini_start) * 1000, 2)
                    if resp.status_code == 200:
                        result = resp.json()
                        candidates = result.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                text_content = parts[0].get("text", "")
                                try:
                                    raw_goal_data = json.loads(text_content)
                                    if (
                                        isinstance(raw_goal_data, dict)
                                        and "actions" in raw_goal_data
                                    ):
                                        gemini_succeeded = True
                                        break  # success — stop trying models
                                except json.JSONDecodeError:
                                    raw_goal_data = None
                    elif resp.status_code == 429:
                        # Quota exceeded — fall back to deterministic immediately
                        gemini_latency_ms = round((time.time() - gemini_start) * 1000, 2)
                        break
                    elif resp.status_code == 404:
                        # Model not found — try next fallback
                        continue
                    else:
                        gemini_latency_ms = round((time.time() - gemini_start) * 1000, 2)
                        break
            except Exception:
                gemini_latency_ms = round((time.time() - gemini_start) * 1000, 2)
                raw_goal_data = None
                break

    deterministic_fallback_used = not gemini_succeeded

    if not raw_goal_data:
        extracted = _extract_steps_from_siis_content(request.siis_response.content)
        actions_list = []
        for sec_title, steps in extracted:
            chunks = [steps[i : i + 4] for i in range(0, len(steps), 4)]
            step_groups = [{"steps": chunk} for chunk in chunks if chunk]
            actions_list.append(
                {
                    "actionName": _sanitize_no_urls(sec_title[:60]),
                    "description": f"Perform {_sanitize_no_urls(sec_title)} to resolve issue.",
                    "category": "manual",
                    "stepGroups": step_groups,
                }
            )

        raw_goal_data = {
            "goal": f"Follow these steps to resolve: {_sanitize_no_urls(request.siis_response.title)}",
            "title": _sanitize_no_urls(request.siis_response.title),
            "actions": actions_list,
        }

    # Normalize & enrich with official Samsung deeplinks strictly from official catalog
    retriever = get_retriever()
    official_uris: Set[str] = {item.get("deeplink") for item in retriever.catalog}
    actions: List[Action] = []
    matched_scores: List[float] = []

    for raw_act in raw_goal_data.get("actions", []):
        act_name = _sanitize_no_urls(str(raw_act.get("actionName", "Diagnostic Action")))
        act_desc = _sanitize_no_urls(
            str(raw_act.get("description", "Follow the indicated steps."))
        )
        cat_str = str(raw_act.get("category", "manual")).lower()
        cat = actionCategory.manual
        if cat_str in ("auto", "manual", "critical"):
            cat = actionCategory(cat_str)

        step_groups: List[StepGroup] = []
        for raw_sg in raw_act.get("stepGroups", []):
            step_list = [
                _sanitize_no_urls(str(s))
                for s in raw_sg.get("steps", [])
                if _sanitize_no_urls(str(s)).strip()
            ]
            if not step_list:
                continue

            combined_steps_text = f"{act_name} " + " ".join(step_list)
            match_res = retriever.search(combined_steps_text, threshold=0.22)

            act_dl = None
            val_dl = None
            if match_res:
                candidate_act, candidate_val, sim_score = match_res
                # Strict verification: deeplink must exist in official catalog
                if candidate_act and candidate_act.deeplink in official_uris:
                    act_dl = candidate_act
                    matched_scores.append(sim_score)
                if candidate_val and candidate_val.deeplink in official_uris:
                    val_dl = candidate_val

            step_groups.append(
                StepGroup(
                    steps=step_list,
                    actionableDeeplink=act_dl,
                    validationDeeplink=val_dl,
                )
            )

        if step_groups:
            actions.append(
                Action(
                    actionName=act_name,
                    description=act_desc,
                    stepGroups=step_groups,
                    category=cat,
                )
            )

    # Calculate deterministic relevance score (bounded in [0.0, 1.0])
    if matched_scores:
        computed_score = round(
            min(1.0, max(0.0, sum(matched_scores) / len(matched_scores))), 4
        )
    else:
        query_words = set(re.findall(r"\w+", request.query.lower()))
        siis_words = set(re.findall(r"\w+", request.siis_response.content.lower()))
        overlap = (
            len(query_words.intersection(siis_words)) / len(query_words)
            if query_words
            else 0.5
        )
        computed_score = round(min(1.0, max(0.1, overlap)), 4)

    raw_goal_text = _sanitize_no_urls(
        str(
            raw_goal_data.get(
                "goal", f"Troubleshooting for {request.siis_response.title}"
            )
        )
    )
    raw_title_text = _sanitize_no_urls(
        str(raw_goal_data.get("title", request.siis_response.title))
    )

    goal_obj = Goal(
        goal=raw_goal_text,
        title=raw_title_text,
        actions=actions,
        score=computed_score,
    )

    response = ContextDeeplinkResponse(contexts=[goal_obj])

    # Cache the validated response
    if use_cache:
        cache.put(
            request.query,
            request.siis_response.title,
            request.siis_response.content,
            response,
        )

    local_latency_ms = round((time.time() - local_start) * 1000, 2)
    meta = {
        "cache_hit": False,
        "cache_type": "miss",
        "cache_similarity": 0.0,
        "gemini_called": gemini_called,
        "gemini_succeeded": gemini_succeeded,
        "deterministic_fallback_used": deterministic_fallback_used,
    }

    return response, local_latency_ms, gemini_latency_ms, meta


async def generate_troubleshooting(
    request: TroubleshootRequest,
) -> ContextDeeplinkResponse:
    response, _local_lat, _gem_lat, _meta = await generate_troubleshooting_with_timing(
        request
    )
    return response
