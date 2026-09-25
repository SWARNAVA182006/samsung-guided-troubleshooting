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
from .validator import validate_and_repair_response

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


# Additional stopwords for topic derivation from SIIS titles
_TITLE_STOPWORDS: Set[str] = {
    "samsung", "galaxy", "phone", "tablet", "device", "on", "a", "an",
    "the", "and", "or", "in", "of", "to", "for", "some", "things", "check",
    "first", "how", "use", "your", "is", "are", "not", "with", "what",
    "basics", "guide", "troubleshooting", "issue", "issues", "problem", "problems",
}

# Map common SIIS title keywords to clean topic names
_TOPIC_MAP: dict = {
    "wifi": "Wi-Fi", "wi-fi": "Wi-Fi", "bluetooth": "Bluetooth",
    "battery": "Battery", "charging": "Charging", "camera": "Camera",
    "display": "Display", "screen": "Screen", "fingerprint": "Fingerprint",
    "audio": "Audio", "sound": "Sound", "speaker": "Speaker",
    "email": "Email", "connectivity": "Connectivity", "network": "Network",
    "storage": "Storage", "performance": "Performance", "payment": "Payment",
    "location": "Location", "nfc": "NFC", "sim": "SIM", "call": "Calling",
    "calls": "Calling", "app": "App", "apps": "Apps", "update": "Software",
    "hotspot": "Hotspot", "mobile": "Mobile", "data": "Mobile Data",
    "watch": "Galaxy Watch", "pay": "Samsung Pay", "memory": "Storage",
    "overheating": "Overheating", "heat": "Overheating", "slow": "Performance",
    "freeze": "Performance", "lagging": "Performance", "touch": "Touchscreen",
    "mirroring": "Screen Mirroring", "biometric": "Biometrics",
    "find": "Find My Mobile", "security": "Security",
}


def _derive_topic_name(siis_title: str) -> str:
    """Derive a clean 2-3 word topic name from a SIIS article title.

    Examples:
        "Blank or black display on a Samsung phone or tablet" -> "Display"
        "Wi-Fi connection issues on Samsung phone" -> "Wi-Fi Connection"
        "Camera app not working on Samsung device" -> "Camera App"
        "Battery draining quickly on Samsung phone" -> "Battery"
    """
    lower = siis_title.lower()

    # Check direct keyword map first
    for kw, name in _TOPIC_MAP.items():
        if kw in lower.split() or f" {kw}" in lower or lower.startswith(kw):
            return name

    # Extract meaningful words, strip stopwords
    words = [w for w in re.findall(r"[\w-]+", siis_title) if w.lower() not in _TITLE_STOPWORDS and len(w) > 2]
    if not words:
        words = re.findall(r"[\w-]+", siis_title)[:3]

    # Title-case and take up to 2 words
    titled = [w.capitalize() for w in words[:2]]
    return " ".join(titled) if titled else "Device"


def _derive_action_name(section_title: str) -> str:
    """Derive a clean 2-3 word action name from a SIIS section header.

    Examples:
        "Step 1: Check Email Access on a PC" -> "Check Email"
        "Force a Restart" -> "Force Restart"
        "Troubleshooting Steps" -> "Diagnostic Steps"
    """
    # Remove step numbering and common prefixes
    cleaned = re.sub(r"^(step\s+\d+[\.:]\s*|#{1,3}\s*)", "", section_title, flags=re.IGNORECASE).strip()
    cleaned = _sanitize_no_urls(cleaned)

    skip_words = {
        "a", "an", "the", "and", "or", "in", "on", "at", "to", "for",
        "of", "with", "your", "this", "my", "is", "using", "how"
    }
    words = [w for w in re.findall(r"[\w-]+", cleaned) if w.lower() not in skip_words]

    if not words:
        return "Diagnostic Step"

    # Take up to 3 words, title-case
    result_words = [w.capitalize() for w in words[:3]]
    return " ".join(result_words)


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
        # Derive a clean topic name from the SIIS title for the goal string
        topic_hint = _derive_topic_name(request.siis_response.title)
        prompt = (
            "You are a Samsung Guided Troubleshooting AI engine.\n"
            f"User Complaint: {request.query}\n"
            f"SIIS Article Title: {request.siis_response.title}\n"
            f"SIIS Article Content:\n{request.siis_response.content}\n\n"
            "Task: Extract step-by-step diagnostic actions grounded strictly in the provided SIIS text.\n"
            "Rules:\n"
            "1. Ground all steps strictly in the SIIS text. Do NOT invent steps or external URLs.\n"
            "2. Group steps into 2-5 logical action groups. Each group addresses one repair step.\n"
            "3. Assign category 'auto', 'manual', or 'critical' for each action.\n"
            f"4. The 'goal' field MUST be exactly: Follow these steps to perform this {topic_hint} Troubleshooting.\n"
            f"5. The 'title' field MUST be exactly 2-3 words: {topic_hint}\n"
            "6. Each actionName must be 2-3 words describing the action clearly (e.g. 'Check Display', 'Reset Network', 'Clear Cache').\n"
            "7. Each description must be exactly 5-7 words starting with 'It will' (e.g. 'It will check display brightness settings.').\n"
            "8. Return strict JSON only, no markdown:\n"
            "{\n"
            f'  "goal": "Follow these steps to perform this {topic_hint} Troubleshooting.",\n'
            f'  "title": "{topic_hint}",\n'
            '  "actions": [\n'
            "    {\n"
            '      "actionName": "Check Display",\n'
            '      "description": "It will check display refresh settings.",\n'
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
        topic_name = _derive_topic_name(request.siis_response.title)
        actions_list = []
        for sec_title, steps in extracted:
            chunks = [steps[i : i + 4] for i in range(0, len(steps), 4)]
            step_groups = [{"steps": chunk} for chunk in chunks if chunk]
            # Generate a human-readable 2-3 word action name from the section title
            clean_action_name = _derive_action_name(sec_title)
            actions_list.append(
                {
                    "actionName": clean_action_name,
                    "description": f"It will help resolve {topic_name.lower()} issue.",
                    "category": "manual",
                    "stepGroups": step_groups,
                }
            )

        raw_goal_data = {
            "goal": f"Follow these steps to perform this {topic_name} Troubleshooting.",
            "title": topic_name,
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
                "goal", f"Follow these steps to perform this {request.siis_response.title} Troubleshooting."
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

    # Pass through authoritative validation & repair layer
    response = validate_and_repair_response(
        response,
        official_uris,
        query=request.query,
        siis_title=request.siis_response.title,
        siis_content=request.siis_response.content,
    )

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
