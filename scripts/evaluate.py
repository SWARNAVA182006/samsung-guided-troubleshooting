"""20-Case Official Samsung SIIS Evaluation & Benchmarking Script.

Processes the 20 official SIIS benchmark queries from data/siis_responses.json
through the grounded generation & deeplink retrieval pipeline.
"""
import asyncio
import json
import sys
import time
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import Any, Dict, List

from app.pipeline import generate_troubleshooting
from app.schemas.models import ContextDeeplinkResponse, SIISResponsePayload, TroubleshootRequest
from app.services.data_loader import load_siis_responses


async def run_evaluation() -> Dict[str, Any]:
    print("=" * 70)
    print("SAMSUNG GUIDED TROUBLESHOOTING ENGINE — 20-CASE EVALUATION SUITE")
    print("=" * 70)

    siis_data = load_siis_responses()
    responses_list = siis_data.get("responses", [])
    print(f"Loaded {len(responses_list)} official SIIS benchmark cases.\n")

    results: List[Dict[str, Any]] = []
    start_total_time = time.time()

    valid_schema_count = 0
    total_actions_count = 0
    actions_with_deeplinks_count = 0
    total_latency = 0.0

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

        case_start = time.time()
        try:
            res: ContextDeeplinkResponse = await generate_troubleshooting(req)
            case_latency = round((time.time() - case_start) * 1000, 2)
            total_latency += case_latency

            is_valid = len(res.contexts) > 0 and len(res.contexts[0].actions) > 0
            if is_valid:
                valid_schema_count += 1

            case_actions = res.contexts[0].actions if is_valid else []
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
                    "valid": is_valid,
                    "actions_count": len(case_actions),
                    "deeplinks_count": case_deeplinks,
                    "latency_ms": case_latency,
                }
            )

            print(
                f"[{idx:02d}/20] ID: {item_id:<7} | Valid: {str(is_valid):<5} | "
                f"Actions: {len(case_actions):<2} | Deeplinks: {case_deeplinks:<2} | Latency: {case_latency}ms"
            )
        except Exception as e:
            case_latency = round((time.time() - case_start) * 1000, 2)
            results.append(
                {
                    "id": item_id,
                    "title": title[:50],
                    "valid": False,
                    "error": str(e),
                    "latency_ms": case_latency,
                }
            )
            print(f"[{idx:02d}/20] ID: {item_id:<7} | ERROR: {str(e)}")

    total_duration = round(time.time() - start_total_time, 2)
    avg_latency = round(total_latency / len(responses_list), 2) if responses_list else 0.0

    summary = {
        "total_cases": len(responses_list),
        "valid_schema_cases": valid_schema_count,
        "schema_pass_rate": round(valid_schema_count / len(responses_list) * 100, 2),
        "total_actions_generated": total_actions_count,
        "total_deeplinks_matched": actions_with_deeplinks_count,
        "average_latency_ms": avg_latency,
        "total_duration_sec": total_duration,
        "case_details": results,
    }

    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY REPORT")
    print("=" * 70)
    print(f"Total Cases Evaluated:       {summary['total_cases']}")
    print(f"Valid Schema Responses:      {summary['valid_schema_cases']} / {summary['total_cases']} ({summary['schema_pass_rate']}%)")
    print(f"Total Actions Generated:     {summary['total_actions_generated']}")
    print(f"Total Deeplinks Matched:     {summary['total_deeplinks_matched']}")
    print(f"Average Case Latency:        {summary['average_latency_ms']} ms")
    print(f"Total Evaluation Runtime:    {summary['total_duration_sec']} seconds")
    print("=" * 70)

    output_dir = Path("scripts/output")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_file = output_dir / "evaluation_report.json"
    report_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\nSaved evaluation results report to: {report_file}")

    return summary


if __name__ == "__main__":
    asyncio.run(run_evaluation())
