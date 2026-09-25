"""Authoritative Output Validation and Repair Layer for Samsung Guided Troubleshooting.

Enforces all 11 Phase 4 & Phase 2 contract rules deterministically:
1. Pydantic schema validation.
2. Goal regex validation (^Follow these steps to perform this .+ (Troubleshooting|Configuration)\\.$).
3. Title word count (2-3 words).
4. Action description word count (5-7 words) & "It will" prefix.
5. Score range [0.0, 1.0].
6. Non-empty steps.
7. Category validity (auto, manual, critical).
8. Deeplink catalog validity.
9. Auto-action deeplink requirement (fallback bixby://dummy_positive).
10. Zero URL leak check.
11. Validation deeplink integrity.
"""
import re
from typing import List, Set, Optional

from .models import (
    Action,
    ContextDeeplinkResponse,
    Deeplink,
    Goal,
    StepGroup,
    ValidationDeepLink,
    actionCategory,
)

STOPWORDS: Set[str] = {
    "i", "my", "me", "the", "a", "an", "is", "are", "was", "were", "and",
    "or", "in", "on", "at", "to", "for", "it", "when", "then", "of", "with", "this", "that",
    "how", "fix", "resolve", "guide", "issue", "problem", "my"
}

GOAL_REGEX = re.compile(
    r"^Follow these steps to perform this .+\s+(Troubleshooting|Configuration)\.$",
    re.IGNORECASE,
)


def sanitize_text(text: str) -> str:
    """Strip external web URLs, markdown links, and HTML tags while preserving text."""
    if not text:
        return ""
    cleaned = re.sub(r"https?://\S+", "", text)
    cleaned = re.sub(r"ftp://\S+", "", cleaned)
    cleaned = re.sub(r"www\.\S+", "", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", cleaned)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    return cleaned.strip()


def _cap_word(w: str) -> str:
    if "-" in w:
        return "-".join(part.capitalize() for part in w.split("-"))
    return w.capitalize()


def normalize_title(title: str) -> str:
    """Ensure Title is strictly 2 to 3 words."""
    cleaned = sanitize_text(title)
    words = [w for w in re.findall(r"[\w-]+", cleaned) if w]
    if not words:
        return "Device Troubleshooting"
    elif len(words) == 1:
        return f"{_cap_word(words[0])} Troubleshooting"
    elif len(words) in (2, 3):
        return " ".join(_cap_word(w) for w in words)
    else:
        key_words = [w for w in words if w.lower() not in STOPWORDS]
        if len(key_words) >= 2:
            return " ".join(_cap_word(w) for w in key_words[:3])
        return " ".join(_cap_word(w) for w in words[:3])


def normalize_action_description(desc: str, action_name: str) -> str:
    """Ensure Action Description is strictly 5 to 7 words and starts with 'It will'."""
    cleaned = sanitize_text(desc)
    cleaned = re.sub(r"^(it\s+will|this\s+will|will)\s+", "", cleaned, flags=re.IGNORECASE).strip()
    words = [w for w in re.findall(r"[\w-]+", cleaned) if w]

    content_words = [w.lower() for w in words if w.lower() not in STOPWORDS]
    if len(content_words) < 3:
        act_words = [w.lower() for w in re.findall(r"[\w-]+", action_name) if w.lower() not in STOPWORDS]
        content_words = act_words + ["resolve", "your", "issue"]

    body_slice = content_words[:4]
    full_words = ["It", "will"] + body_slice

    if len(full_words) < 5:
        full_words = ["It", "will", "help", "resolve", "this", "issue"]
    elif len(full_words) > 7:
        full_words = full_words[:7]

    return " ".join(full_words) + "."


def normalize_goal_string(goal_str: str, title_str: str) -> str:
    """Ensure Goal strictly matches required regex format."""
    cleaned = sanitize_text(goal_str)
    if GOAL_REGEX.match(cleaned):
        return cleaned

    target_name = normalize_title(title_str)
    suffix = "Configuration" if "config" in title_str.lower() or "setting" in title_str.lower() else "Troubleshooting"
    return f"Follow these steps to perform this {target_name} {suffix}."


def validate_and_repair_response(
    response: ContextDeeplinkResponse,
    official_uris: Set[str],
    query: str = "",
    siis_title: str = "",
    siis_content: str = "",
) -> ContextDeeplinkResponse:
    """Authoritative validation and repair layer enforcing all Theme 2 contract rules."""
    if not response.contexts:
        raise ValueError("Contexts list cannot be empty")

    repaired_contexts: List[Goal] = []
    for g in response.contexts:
        repaired_title = normalize_title(g.title)
        repaired_goal = normalize_goal_string(g.goal, repaired_title)
        repaired_score = round(min(1.0, max(0.0, float(g.score))), 4)

        repaired_actions: List[Action] = []
        for act in g.actions:
            act_name = sanitize_text(act.actionName) or "Diagnostic Step"
            act_desc = normalize_action_description(act.description, act_name)

            cat = (
                act.category
                if act.category in (actionCategory.auto, actionCategory.manual, actionCategory.critical)
                else actionCategory.manual
            )

            repaired_step_groups: List[StepGroup] = []
            for sg in act.stepGroups:
                clean_steps = [sanitize_text(s) for s in sg.steps if sanitize_text(s)]
                if not clean_steps:
                    continue

                act_dl = sg.actionableDeeplink
                val_dl = sg.validationDeeplink

                if act_dl:
                    if act_dl.deeplink not in official_uris and act_dl.deeplink != "bixby://dummy_positive":
                        act_dl = None

                if val_dl:
                    if val_dl.deeplink not in official_uris:
                        val_dl = None

                if cat == actionCategory.auto and act_dl is None:
                    act_dl = Deeplink(
                        deeplink="bixby://dummy_positive",
                        description="It will proceed with positive confirmation.",
                        message="Default positive fallback action",
                    )

                repaired_step_groups.append(
                    StepGroup(
                        steps=clean_steps,
                        actionableDeeplink=act_dl,
                        validationDeeplink=val_dl,
                    )
                )

            if repaired_step_groups:
                repaired_actions.append(
                    Action(
                        actionName=act_name,
                        description=act_desc,
                        stepGroups=repaired_step_groups,
                        category=cat,
                    )
                )

        if repaired_actions:
            repaired_contexts.append(
                Goal(
                    goal=repaired_goal,
                    title=repaired_title,
                    actions=repaired_actions,
                    score=repaired_score,
                )
            )

    if not repaired_contexts:
        raise ValueError("Failed to repair response context")

    return ContextDeeplinkResponse(contexts=repaired_contexts)
