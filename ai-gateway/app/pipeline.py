"""Grounded troubleshooting generation & deterministic schema normalization pipeline."""
import json
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from .models import (
    Action,
    ContextDeeplinkResponse,
    Goal,
    StepGroup,
    TroubleshootRequest,
    actionCategory,
)
from .retrieval import get_retriever

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


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
                current_steps.append(step_text)

    if current_steps:
        sections.append((current_section_title, current_steps))

    if not sections:
        sections = [("General Diagnostics", [lines[0] if lines else "Follow device diagnostic instructions."])]

    return sections


async def generate_troubleshooting_with_timing(
    request: TroubleshootRequest,
) -> Tuple[ContextDeeplinkResponse, float, float]:
    """Execute grounded pipeline and return (response, local_pipeline_latency_ms, gemini_api_latency_ms)."""
    local_start = time.time()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    raw_goal_data: Optional[Dict[str, Any]] = None
    gemini_latency_ms = 0.0

    if api_key:
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
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, json=payload)
                gemini_latency_ms = round((time.time() - gemini_start) * 1000, 2)
                if resp.status_code == 200:
                    result = resp.json()
                    text_content = result["candidates"][0]["content"]["parts"][0]["text"]
                    raw_goal_data = json.loads(text_content)
        except Exception:
            gemini_latency_ms = round((time.time() - gemini_start) * 1000, 2)
            raw_goal_data = None

    if not raw_goal_data:
        extracted = _extract_steps_from_siis_content(request.siis_response.content)
        actions_list = []
        for sec_title, steps in extracted:
            chunks = [steps[i : i + 4] for i in range(0, len(steps), 4)]
            step_groups = [{"steps": chunk} for chunk in chunks if chunk]
            actions_list.append(
                {
                    "actionName": sec_title[:60],
                    "description": f"Perform {sec_title} to resolve issue.",
                    "category": "manual",
                    "stepGroups": step_groups,
                }
            )

        raw_goal_data = {
            "goal": f"Follow these steps to resolve: {request.siis_response.title}",
            "title": request.siis_response.title,
            "actions": actions_list,
        }

    # Normalize & enrich with official Samsung deeplinks from catalog
    retriever = get_retriever()
    actions: List[Action] = []
    matched_scores: List[float] = []

    for raw_act in raw_goal_data.get("actions", []):
        act_name = raw_act.get("actionName", "Diagnostic Action")
        act_desc = raw_act.get("description", "Follow the indicated steps.")
        cat_str = str(raw_act.get("category", "manual")).lower()
        cat = actionCategory.manual
        if cat_str in ("auto", "manual", "critical"):
            cat = actionCategory(cat_str)

        step_groups: List[StepGroup] = []
        for raw_sg in raw_act.get("stepGroups", []):
            step_list = [str(s) for s in raw_sg.get("steps", []) if str(s).strip()]
            if not step_list:
                continue

            combined_steps_text = f"{act_name} " + " ".join(step_list)
            match_res = retriever.search(combined_steps_text, threshold=0.22)

            act_dl = None
            val_dl = None
            if match_res:
                act_dl, val_dl, sim_score = match_res
                matched_scores.append(sim_score)

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
        computed_score = round(min(1.0, max(0.0, sum(matched_scores) / len(matched_scores))), 4)
    else:
        # Grounding text overlap fallback score if no catalog deeplinks matched
        query_words = set(re.findall(r"\w+", request.query.lower()))
        siis_words = set(re.findall(r"\w+", request.siis_response.content.lower()))
        overlap = len(query_words.intersection(siis_words)) / len(query_words) if query_words else 0.5
        computed_score = round(min(1.0, max(0.1, overlap)), 4)

    goal_obj = Goal(
        goal=raw_goal_data.get("goal", f"Troubleshooting for {request.siis_response.title}"),
        title=raw_goal_data.get("title", request.siis_response.title),
        actions=actions,
        score=computed_score,
    )

    local_latency_ms = round((time.time() - local_start) * 1000, 2)
    return ContextDeeplinkResponse(contexts=[goal_obj]), local_latency_ms, gemini_latency_ms


async def generate_troubleshooting(request: TroubleshootRequest) -> ContextDeeplinkResponse:
    response, _local_lat, _gem_lat = await generate_troubleshooting_with_timing(request)
    return response
