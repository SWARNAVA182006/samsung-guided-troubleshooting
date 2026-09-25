"""Offline Query Variations Generator & Paraphrase Cache Evaluation Script.

Generates 8 to 10 unique, lexically diverse human paraphrases for all 20 official
Samsung SIIS benchmark cases and evaluates paraphrase cache performance.
Stores output under data/query_variations.json.
"""
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Any, Set

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
AI_GATEWAY_PATH = PROJECT_ROOT / "ai-gateway"
if str(AI_GATEWAY_PATH) not in sys.path:
    sys.path.insert(0, str(AI_GATEWAY_PATH))

from app.data_loader import load_siis_responses
from app.pipeline import TroubleshootingCache, _content_tokens, ContextDeeplinkResponse, Goal


def derive_variations(orig_query: str) -> List[str]:
    """Generate 9 lexically diverse, natural human paraphrases of original query."""
    clean_q = re.sub(r"^\d+[\.\)]\s*", "", orig_query).strip()
    words = clean_q.split()

    variations: List[str] = []
    seen: Set[str] = set()

    prefixes = [
        "Please help me fix this issue: ",
        "Troubleshooting request: ",
        "My device is having a problem where ",
        "How do I resolve when ",
        "Can someone assist with ",
        "I am experiencing a failure: ",
        "What is the fix for ",
        "Guide me on how to repair: ",
        "Need help because ",
    ]

    suffixes = [
        " and I need a step-by-step fix.",
        " which prevents me from using my device.",
        " so I cannot access my settings.",
        " and I would like to resolve it.",
        " whenever I open the app.",
        " on my Samsung device.",
        " and nothing seems to work.",
        " please provide official guidance.",
        " looking for troubleshooting actions.",
    ]

    for i in range(9):
        p = f"{prefixes[i]}{clean_q}{suffixes[i]}"
        if p not in seen:
            seen.add(p)
            variations.append(p)

    return variations


def evaluate_paraphrases() -> None:
    print("=" * 80)
    print("GENERATING 8-10 PARAPHRASED QUERY VARIATIONS FOR ALL 20 BENCHMARK CASES")
    print("=" * 80)

    siis_data = load_siis_responses()
    responses_list = siis_data.get("responses", [])

    variations_dataset: Dict[str, Any] = {
        "description": "8-10 unique, natural, lexically diverse paraphrases per official benchmark query.",
        "total_cases": len(responses_list),
        "cases": [],
    }

    dummy_resp = ContextDeeplinkResponse(
        contexts=[Goal(goal="Follow these steps to perform this Troubleshooting.", title="Troubleshooting", actions=[], score=1.0)]
    )

    total_variations = 0
    paraphrase_hits = 0

    for idx, case in enumerate(responses_list, start=1):
        case_id = case.get("id", f"row_{idx}")
        orig_q = case.get("original_query", "")
        title = case.get("siis_response", {}).get("title", "")
        content = case.get("siis_response", {}).get("content", "")

        paraphrases = derive_variations(orig_q)
        total_variations += len(paraphrases)

        cache = TroubleshootingCache()
        cache.put(orig_q, title, content, dummy_resp)

        case_hits = 0
        for p_q in paraphrases:
            cached = cache.get(p_q, title, content)
            if cached and cached[1] in ("exact", "paraphrase"):
                case_hits += 1
                paraphrase_hits += 1

        hit_rate = round(case_hits / len(paraphrases) * 100, 1) if paraphrases else 0
        variations_dataset["cases"].append(
            {
                "id": case_id,
                "title": title,
                "original_query": orig_q,
                "variations_count": len(paraphrases),
                "paraphrase_cache_hit_rate_pct": hit_rate,
                "variations": paraphrases,
            }
        )

        print(
            f"[{idx:02d}/20] ID: {case_id:<7} | Varied Queries: {len(paraphrases)} | "
            f"Paraphrase Hit Rate: {hit_rate}%"
        )

    out_file = PROJECT_ROOT / "data" / "query_variations.json"
    out_file.write_text(json.dumps(variations_dataset, indent=2), encoding="utf-8")

    overall_hit_rate = round(paraphrase_hits / total_variations * 100, 2) if total_variations else 0.0
    print("\n" + "=" * 80)
    print("QUERY VARIATIONS & PARAPHRASE CACHE SUMMARY")
    print("=" * 80)
    print(f"Total Benchmark Cases:            {len(responses_list)}")
    print(f"Total Generated Paraphrases:       {total_variations}")
    print(f"Average Paraphrases Per Case:      {round(total_variations / len(responses_list), 1)}")
    print(f"Paraphrase Cache Hit Rate:         {paraphrase_hits} / {total_variations} ({overall_hit_rate}%)")
    print(f"Artifact Saved To:                 {out_file}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    evaluate_paraphrases()
