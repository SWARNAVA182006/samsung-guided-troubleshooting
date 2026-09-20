"""20-Case Official Samsung SIIS Evaluation & Threshold Audit Script.

Evaluates the 20 official SIIS benchmark cases from data/siis_responses.json:
1. Measures schema validity pass rate (schema structure validation).
2. Performs an empirical threshold audit across [0.10, 0.15, 0.20, 0.22, 0.25, 0.30, 0.35, 0.40, 0.50].
3. Disambiguates local deterministic pipeline latency vs Gemini API latency.
"""
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

# Ensure ai-gateway is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
AI_GATEWAY_PATH = PROJECT_ROOT / "ai-gateway"
if str(AI_GATEWAY_PATH) not in sys.path:
    sys.path.insert(0, str(AI_GATEWAY_PATH))

from app.data_loader import load_deeplinks, load_siis_responses
from app.models import ContextDeeplinkResponse, SIISResponsePayload, TroubleshootRequest
from app.pipeline import generate_troubleshooting_with_timing
from app.retrieval import DeeplinkRetriever, _tokenize


def run_threshold_experiment() -> Dict[str, Any]:
    """Empirical threshold evaluation across 578 deeplinks and 20 official SIIS benchmark cases."""
    print("=" * 75)
    print("EMPIRICAL RETRIEVAL THRESHOLD AUDIT (0.10 to 0.50)")
    print("=" * 75)

    siis_data = load_siis_responses()
    responses_list = siis_data.get("responses", [])
    retriever = DeeplinkRetriever()

    # Collect step query texts from all 20 cases
    step_queries: List[str] = []
    for item in responses_list:
        content = item.get("siis_response", {}).get("content", "")
        lines = [l.strip() for l in content.splitlines() if l.strip()]
        for l in lines:
            if len(l) > 15:
                step_queries.append(l)

    thresholds = [0.10, 0.15, 0.20, 0.22, 0.25, 0.30, 0.35, 0.40, 0.50]
    threshold_results = {}

    for t in thresholds:
        matches = 0
        no_matches = 0
        scores: List[float] = []

        for q in step_queries:
            res = retriever.search(q, threshold=t)
            if res:
                matches += 1
                scores.append(res[2])
            else:
                no_matches += 1

        avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0
        threshold_results[f"threshold_{t:.2f}"] = {
            "threshold": t,
            "total_queries": len(step_queries),
            "matched_queries": matches,
            "unmatched_queries": no_matches,
            "match_rate_pct": round(matches / len(step_queries) * 100, 2) if step_queries else 0,
            "average_matched_similarity": avg_score,
            "min_matched_similarity": round(min(scores), 4) if scores else 0,
            "max_matched_similarity": round(max(scores), 4) if scores else 0,
        }

        print(
            f"Threshold: {t:.2f} | Matched: {matches:<3}/{len(step_queries)} ({threshold_results[f'threshold_{t:.2f}']['match_rate_pct']:<5}%) | "
            f"Avg Similarity: {avg_score:.4f} | Min: {threshold_results[f'threshold_{t:.2f}']['min_matched_similarity']:.4f} | "
            f"Max: {threshold_results[f'threshold_{t:.2f}']['max_matched_similarity']:.4f}"
        )

    print("=" * 75 + "\n")
    return threshold_results


async def run_evaluation() -> Dict[str, Any]:
    print("=" * 75)
    print("SAMSUNG GUIDED TROUBLESHOOTING ENGINE — 20-CASE BENCHMARK EVALUATION")
    print("=" * 75)

    siis_data = load_siis_responses()
    responses_list = siis_data.get("responses", [])
    print(f"Loaded {len(responses_list)} official SIIS benchmark cases.\n")

    results: List[Dict[str, Any]] = []
    start_total_time = time.time()

    valid_schema_count = 0
    total_actions_count = 0
    actions_with_deeplinks_count = 0
    total_local_lat = 0.0
    total_gemini_lat = 0.0

    for idx, item in enumerate(responses_list, start=1):
        item_id = item.get("id", f"row_{idx}")
        orig_query = item.get("original_query", "")
        siis_resp = item.get("siis_response", {})
        title = siis_resp.get("title", "")
        content = siis_resp.get("content", "")

        req = TroubleshootRequest(
            query=orig_query,
            siis_response=SIISResponsePayload(title=title, content=content),
        )

        try:
            res, local_lat, gem_lat = await generate_troubleshooting_with_timing(req)
            total_local_lat += local_lat
            total_gemini_lat += gem_lat

            is_valid = len(res.contexts) > 0 and len(res.contexts[0].actions) > 0
            if is_valid:
                valid_schema_count += 1

            goal = res.contexts[0] if is_valid else None
            case_actions = goal.actions if goal else []
            total_actions_count += len(case_actions)

            case_deeplinks = 0
            for act in case_actions:
                for sg in act.stepGroups:
                    if sg.actionableDeeplink:
                        case_deeplinks += 1
                        actions_with_deeplinks_count += 1

            results.append(
                {
                    "id": item_id,
                    "title": title[:50],
                    "schema_valid": is_valid,
                    "computed_score": goal.score if goal else 0.0,
                    "actions_count": len(case_actions),
                    "deeplinks_count": case_deeplinks,
                    "local_pipeline_latency_ms": local_lat,
                    "gemini_api_latency_ms": gem_lat,
                }
            )

            print(
                f"[{idx:02d}/20] ID: {item_id:<7} | SchemaValid: {str(is_valid):<5} | "
                f"Score: {goal.score if goal else 0.0:.4f} | Actions: {len(case_actions):<2} | "
                f"Deeplinks: {case_deeplinks:<2} | LocalLat: {local_lat:<6}ms | GemLat: {gem_lat}ms"
            )
        except Exception as e:
            results.append(
                {
                    "id": item_id,
                    "title": title[:50],
                    "schema_valid": False,
                    "error": str(e),
                }
            )
            print(f"[{idx:02d}/20] ID: {item_id:<7} | ERROR: {str(e)}")

    total_duration = round(time.time() - start_total_time, 2)
    avg_local_lat = round(total_local_lat / len(responses_list), 2) if responses_list else 0.0
    avg_gemini_lat = round(total_gemini_lat / len(responses_list), 2) if responses_list else 0.0

    threshold_audit = run_threshold_experiment()

    summary = {
        "total_cases": len(responses_list),
        "valid_schema_cases": valid_schema_count,
        "schema_pass_rate_pct": round(valid_schema_count / len(responses_list) * 100, 2),
        "total_actions_generated": total_actions_count,
        "total_deeplinks_matched": actions_with_deeplinks_count,
        "latency_metrics": {
            "average_local_pipeline_latency_ms": avg_local_lat,
            "average_gemini_api_latency_ms": avg_gemini_lat,
            "latency_note": "Local pipeline latency represents local TF-IDF index search & deterministic parsing. Gemini API latency is recorded when GEMINI_API_KEY is configured.",
        },
        "total_evaluation_runtime_sec": total_duration,
        "threshold_audit_summary": threshold_audit,
        "case_details": results,
    }

    print("=" * 75)
    print("EVALUATION & BENCHMARK SUMMARY REPORT")
    print("=" * 75)
    print(f"Total Cases Evaluated:                  {summary['total_cases']}")
    print(f"Schema Pass Rate (Structure Valid):     {summary['valid_schema_cases']} / {summary['total_cases']} ({summary['schema_pass_rate_pct']}%)")
    print(f"Total Actions Generated:                {summary['total_actions_generated']}")
    print(f"Total Deeplinks Matched:                {summary['total_deeplinks_matched']}")
    print(f"Average Local Pipeline Latency:         {summary['latency_metrics']['average_local_pipeline_latency_ms']} ms")
    print(f"Average Gemini API Latency:             {summary['latency_metrics']['average_gemini_api_latency_ms']} ms")
    print(f"Total Evaluation Runtime:               {summary['total_evaluation_runtime_sec']} seconds")
    print("=" * 75)

    output_dir = Path("scripts/output")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_file = output_dir / "evaluation_report.json"
    report_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\nSaved full evaluation and threshold audit report to: {report_file}")

    return summary


if __name__ == "__main__":
    asyncio.run(run_evaluation())
