"""20-Case Official Samsung SIIS Benchmark Evaluation & Quality Audit.

Evaluates all 20 official SIIS benchmark cases from data/siis_responses.json:
1. Validates schema correctness against official data/schema.py.
2. Measures action count, step group count, step count, actionable & validation deeplinks.
3. Verifies 100% of returned deeplinks exist in the official 578-entry catalog.
4. Distinguishes catalog-backed URIs from dummy fallback URIs (bixby://dummy_positive).
5. Records local pipeline latency via time.perf_counter(), Gemini API latency, and total latency.
6. Evaluates caching: exact repeat speedup and token-Jaccard paraphrase retrieval.
7. Audits edge cases: URL leak scanning over all text fields in all 20 responses.
8. Conducts empirical threshold audit across [0.10 to 0.50].
9. Generates machine-readable evaluation report under scripts/output/evaluation_report.json.

IMPORTANT MEASUREMENT NOTES:
- All latency figures use time.perf_counter() for precision.
- Schema pass rate, deeplink counts: MEASURED from live pipeline execution.
- Gemini telemetry: MEASURED (0 successes when key is absent or quota exceeded).
- Threshold experiment: MEASURED over SIIS content lines; NOT semantic accuracy.
- Cache speedup: MEASURED from two sequential live requests.
- No ground-truth relevance labels exist; no accuracy/precision claims are made.
"""
import asyncio
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Set

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
AI_GATEWAY_PATH = PROJECT_ROOT / "ai-gateway"
if str(AI_GATEWAY_PATH) not in sys.path:
    sys.path.insert(0, str(AI_GATEWAY_PATH))

from data.schema import ContextDeeplinkResponse as SchemaValidator
from app.data_loader import load_deeplinks, load_siis_responses
from app.models import SIISResponsePayload, TroubleshootRequest
from app.pipeline import generate_troubleshooting_with_timing, get_cache, _sanitize_no_urls
from app.retrieval import DeeplinkRetriever


# ─────────────────────────────────────────────────────────────────────────────
# URL LEAK DETECTION
# ─────────────────────────────────────────────────────────────────────────────

_URL_LEAK_PATTERNS = [
    re.compile(r"https?://", re.IGNORECASE),
    re.compile(r"ftp://", re.IGNORECASE),
    re.compile(r"\bwww\.", re.IGNORECASE),
    re.compile(r"\.(com|net|org|io|gov|edu|co)\b", re.IGNORECASE),
    re.compile(r"\.html?\b", re.IGNORECASE),
    re.compile(r"\[.+?\]\(.+?\)"),          # Markdown links
    re.compile(r"!\[.+?\]\(.+?\)"),         # Markdown images
    re.compile(r"<a\s", re.IGNORECASE),     # HTML anchor tags
]

# Patterns that are ALLOWED (official Samsung deeplinks)
_ALLOWED_PATTERN = re.compile(r"^bixby://")


def _scan_text_for_url_leaks(text: str) -> List[str]:
    """Return list of detected URL-like leaks in a text string.
    bixby:// URIs are explicitly allowed as they are official catalog entries.
    """
    if not text:
        return []
    leaks = []
    for pattern in _URL_LEAK_PATTERNS:
        for match in pattern.finditer(text):
            context = text[max(0, match.start() - 10):match.end() + 30]
            # Skip if it's part of an allowed bixby:// URI
            surrounding = text[max(0, match.start() - 20):match.end() + 20]
            if _ALLOWED_PATTERN.search(surrounding):
                continue
            leaks.append(context.strip())
    return leaks


def _collect_all_text_fields(response_dict: Dict[str, Any]) -> List[str]:
    """Recursively collect all string values from a response dict for URL leak scanning."""
    texts = []
    if isinstance(response_dict, dict):
        for key, val in response_dict.items():
            # Skip deeplink fields (they're official and allowed)
            if key in ("deeplink",):
                continue
            if isinstance(val, str):
                texts.append(val)
            elif isinstance(val, (dict, list)):
                texts.extend(_collect_all_text_fields(val))
    elif isinstance(response_dict, list):
        for item in response_dict:
            texts.extend(_collect_all_text_fields(item))
    return texts


# ─────────────────────────────────────────────────────────────────────────────
# THRESHOLD EXPERIMENT
# ─────────────────────────────────────────────────────────────────────────────

def run_threshold_experiment() -> Dict[str, Any]:
    """Empirical retrieval threshold evaluation across 578 deeplinks and SIIS content lines.

    IMPORTANT: This experiment measures candidate retrieval *rate* at different thresholds.
    It does NOT measure semantic accuracy, precision, or recall against ground-truth labels
    because no ground-truth labels are available.

    The threshold value 0.22 was chosen empirically as the point that provides
    acceptable candidate retrieval while not over-accepting weak matches.
    It is NOT a proven optimal threshold.
    """
    print("=" * 80)
    print("EMPIRICAL RETRIEVAL THRESHOLD AUDIT (0.10 to 0.50)")
    print("NOTE: Measures retrieval rate, NOT semantic accuracy (no ground-truth labels).")
    print("=" * 80)

    siis_data = load_siis_responses()
    responses_list = siis_data.get("responses", [])
    retriever = DeeplinkRetriever()

    step_queries: List[str] = []
    for item in responses_list:
        content = item.get("siis_response", {}).get("content", "")
        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        for ln in lines:
            if len(ln) > 15:
                step_queries.append(ln)

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
            "note": (
                "Match rate = fraction of SIIS content lines scoring >= threshold. "
                "NOT semantic accuracy — no ground-truth labels available."
            ),
        }

        entry = threshold_results[f"threshold_{t:.2f}"]
        print(
            f"Threshold: {t:.2f} | Matched: {matches:<3}/{len(step_queries)} "
            f"({entry['match_rate_pct']:<5}%) | "
            f"Avg Similarity: {avg_score:.4f} | Min: {entry['min_matched_similarity']:.4f} | "
            f"Max: {entry['max_matched_similarity']:.4f}"
        )

    print("=" * 80 + "\n")
    return threshold_results


# ─────────────────────────────────────────────────────────────────────────────
# EDGE CASE & URL LEAK AUDIT
# ─────────────────────────────────────────────────────────────────────────────

async def evaluate_edge_cases() -> Dict[str, Any]:
    """Audit edge cases: URL leak protection, unseen synthetic scenario."""
    print("=" * 80)
    print("EDGE CASE & CONTRACT INTEGRITY AUDIT")
    print("=" * 80)

    # 1. URL Sanitization Unit Test
    dirty_text = "Check http://example.com/settings or https://samsung-fake.com or www.google.com for help"
    cleaned = _sanitize_no_urls(dirty_text)
    url_leak_passed = "http" not in cleaned and "www." not in cleaned
    print(f"URL Sanitizer (unit test):             {'PASSED' if url_leak_passed else 'FAILED'}")

    # 2. Unseen S Pen Scenario — synthetic integration test
    # This is a SINGLE synthetic integration test for an unindexed scenario.
    # It does NOT represent generalized accuracy across unseen inputs.
    unseen_req = TroubleshootRequest(
        query="S Pen disconnected and will not charge on Galaxy Note 20.",
        siis_response=SIISResponsePayload(
            title="S Pen connection troubleshooting",
            content=(
                "## Reset S Pen\n"
                "Insert S Pen into device, go to Settings, tap Advanced features, "
                "tap S Pen, and select Reset.\n"
                "## Safe Mode Check\n"
                "Restart device in Safe Mode to isolate third-party apps."
            ),
        ),
    )
    unseen_resp, _, _, _ = await generate_troubleshooting_with_timing(unseen_req, use_cache=False)
    unseen_passed = len(unseen_resp.contexts) > 0 and len(unseen_resp.contexts[0].actions) > 0

    # 3. Additional unseen scenarios
    unseen_cases = [
        ("Earphone jack not working Galaxy S21", "Galaxy S21 audio output issue",
         "## Check Audio Settings\nGo to Settings > Sounds and vibration > Volume.\n## Try Another Cable\nTest with a known-good cable."),
        ("Samsung Smart Switch backup failing", "Smart Switch backup issues",
         "## Update Smart Switch\nUpdate Samsung Smart Switch from Galaxy Store.\n## Check Storage\nEnsure sufficient free space on both devices."),
    ]
    unseen_results = []
    for uq, ut, uc in unseen_cases:
        req = TroubleshootRequest(
            query=uq,
            siis_response=SIISResponsePayload(title=ut, content=uc),
        )
        resp, _, _, _ = await generate_troubleshooting_with_timing(req, use_cache=False)
        passed = len(resp.contexts) > 0 and len(resp.contexts[0].actions) > 0
        unseen_results.append({"query": uq[:50], "passed": passed})
        print(f"Synthetic scenario ({uq[:40]}...): {'PASSED' if passed else 'FAILED'}")

    print(f"S Pen Synthetic Integration Test:      {'PASSED' if unseen_passed else 'FAILED'}")
    print("=" * 80 + "\n")

    return {
        "url_sanitizer_unit_test_passed": url_leak_passed,
        "s_pen_synthetic_integration_test_passed": unseen_passed,
        "s_pen_note": (
            "Single-case synthetic integration test for an unindexed S Pen troubleshooting scenario. "
            "Does NOT represent generalized accuracy across unseen inputs."
        ),
        "additional_synthetic_tests": unseen_results,
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN 20-CASE EVALUATION
# ─────────────────────────────────────────────────────────────────────────────

async def run_evaluation() -> Dict[str, Any]:
    print("=" * 80)
    print("SAMSUNG GUIDED TROUBLESHOOTING ENGINE — 20-CASE BENCHMARK EVALUATION")
    print("=" * 80)

    siis_data = load_siis_responses()
    responses_list = siis_data.get("responses", [])
    print(f"Loaded {len(responses_list)} official SIIS benchmark cases.\n")

    catalog = load_deeplinks().get("deeplinks", [])
    # Collect all valid URIs including validation deeplinks
    catalog_uris: Set[str] = set()
    for item in catalog:
        if item.get("deeplink"):
            catalog_uris.add(item["deeplink"])
        if item.get("validation") and isinstance(item["validation"], dict):
            if item["validation"].get("deeplink"):
                catalog_uris.add(item["validation"]["deeplink"])

    # dummy_positive is the official fallback — allowed but NOT a catalog entry
    DUMMY_URI = "bixby://dummy_positive"
    official_uris = catalog_uris | {DUMMY_URI}

    results: List[Dict[str, Any]] = []

    # Use perf_counter for precision timing
    start_total_time = time.perf_counter()

    valid_schema_count = 0
    total_actions_count = 0
    total_step_groups_count = 0
    total_steps_count = 0
    total_actionable_dls = 0
    total_validation_dls = 0
    catalog_backed_count = 0
    dummy_fallback_count = 0
    invalid_uri_count = 0
    gemini_succeeded_count = 0
    fallback_used_count = 0
    all_dls_in_catalog_count = 0

    total_local_lat = 0.0
    total_gemini_lat = 0.0

    # URL leak tracking across all 20 cases
    url_leaks_found: List[Dict[str, Any]] = []
    total_fields_scanned = 0

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
            case_start = time.perf_counter()
            res, local_lat, gem_lat, meta = await generate_troubleshooting_with_timing(req, use_cache=False)
            case_elapsed = round((time.perf_counter() - case_start) * 1000, 2)
            total_local_lat += local_lat
            total_gemini_lat += gem_lat

            # Schema validation
            SchemaValidator.model_validate(res.model_dump())
            schema_valid = len(res.contexts) > 0 and len(res.contexts[0].actions) > 0
            if schema_valid:
                valid_schema_count += 1

            if meta["gemini_succeeded"]:
                gemini_succeeded_count += 1
            if meta["deterministic_fallback_used"]:
                fallback_used_count += 1

            goal = res.contexts[0] if schema_valid else None
            case_actions = goal.actions if goal else []
            total_actions_count += len(case_actions)

            case_sg = sum(len(a.stepGroups) for a in case_actions)
            case_steps = sum(len(sg.steps) for a in case_actions for sg in a.stepGroups)
            total_step_groups_count += case_sg
            total_steps_count += case_steps

            case_act_dls = 0
            case_val_dls = 0
            case_uris_valid = True
            case_catalog_backed = 0
            case_dummy_fallback = 0
            case_invalid = 0

            for act in case_actions:
                for sg in act.stepGroups:
                    if sg.actionableDeeplink:
                        case_act_dls += 1
                        total_actionable_dls += 1
                        dl_uri = sg.actionableDeeplink.deeplink
                        if dl_uri == DUMMY_URI:
                            case_dummy_fallback += 1
                            dummy_fallback_count += 1
                        elif dl_uri in catalog_uris:
                            case_catalog_backed += 1
                            catalog_backed_count += 1
                        else:
                            case_invalid += 1
                            invalid_uri_count += 1
                            case_uris_valid = False
                    if sg.validationDeeplink:
                        case_val_dls += 1
                        total_validation_dls += 1
                        if sg.validationDeeplink.deeplink not in official_uris:
                            case_uris_valid = False

            if case_uris_valid:
                all_dls_in_catalog_count += 1

            # URL leak scanning over ALL text fields in this response
            response_dict = res.model_dump()
            all_texts = _collect_all_text_fields(response_dict)
            total_fields_scanned += len(all_texts)
            for txt in all_texts:
                leaks = _scan_text_for_url_leaks(txt)
                if leaks:
                    url_leaks_found.append({
                        "case_id": item_id,
                        "text_fragment": txt[:100],
                        "leaks": leaks,
                    })

            results.append(
                {
                    "id": item_id,
                    "title": title[:50],
                    "schema_valid": schema_valid,
                    "gemini_called": meta["gemini_called"],
                    "gemini_succeeded": meta["gemini_succeeded"],
                    "deterministic_fallback_used": meta["deterministic_fallback_used"],
                    "computed_score": goal.score if goal else 0.0,
                    "actions_count": len(case_actions),
                    "step_groups_count": case_sg,
                    "steps_count": case_steps,
                    "actionable_deeplinks": case_act_dls,
                    "catalog_backed_deeplinks": case_catalog_backed,
                    "dummy_fallback_deeplinks": case_dummy_fallback,
                    "invalid_deeplinks": case_invalid,
                    "validation_deeplinks": case_val_dls,
                    "deeplinks_in_official_catalog": case_uris_valid,
                    "local_pipeline_latency_ms": local_lat,
                    "gemini_api_latency_ms": gem_lat,
                    "total_case_latency_ms": case_elapsed,
                }
            )

            print(
                f"[{idx:02d}/20] ID: {item_id:<7} | Valid: {str(schema_valid):<5} | "
                f"Gemini: {'OK' if meta['gemini_succeeded'] else 'Fallback':<8} | "
                f"Score: {goal.score if goal else 0.0:.4f} | Acts: {len(case_actions):<2} | "
                f"Steps: {case_steps:<2} | DLs: {case_act_dls:<2} (Catalog:{case_catalog_backed} Dummy:{case_dummy_fallback} Bad:{case_invalid}) | "
                f"Local: {local_lat:<7.1f}ms"
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

    total_duration = round(time.perf_counter() - start_total_time, 2)
    avg_local_lat = round(total_local_lat / len(responses_list), 2) if responses_list else 0.0
    avg_gemini_lat = round(total_gemini_lat / len(responses_list), 2) if responses_list else 0.0

    # ── CACHE EVALUATION ─────────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("EVALUATING CACHE PERFORMANCE (EXACT REPEAT & TOKEN-JACCARD PARAPHRASE)")
    print("NOTE: Cache similarity uses token Jaccard, NOT embedding-based semantics.")
    print("=" * 80)
    cache = get_cache()
    cache.clear()
    first_row = responses_list[0]
    eval_req = TroubleshootRequest(
        query=first_row["original_query"],
        siis_response=SIISResponsePayload(**first_row["siis_response"]),
    )

    t0 = time.perf_counter()
    _, miss_lat, _, _ = await generate_troubleshooting_with_timing(eval_req, use_cache=True)
    miss_wall = round((time.perf_counter() - t0) * 1000, 2)

    t1 = time.perf_counter()
    _, exact_lat, _, exact_meta = await generate_troubleshooting_with_timing(eval_req, use_cache=True)
    exact_wall = round((time.perf_counter() - t1) * 1000, 2)

    # Paraphrase: replace a few words to test Jaccard similarity
    para_query = first_row["original_query"].replace("whenever I tap to open", "when opening")
    para_req = TroubleshootRequest(
        query=para_query,
        siis_response=eval_req.siis_response,
    )
    t2 = time.perf_counter()
    _, para_lat, _, para_meta = await generate_troubleshooting_with_timing(para_req, use_cache=True)
    para_wall = round((time.perf_counter() - t2) * 1000, 2)

    exact_speedup = round(miss_lat / exact_lat, 1) if exact_lat > 0 else "N/A"
    cache_metrics = {
        "measurement_method": "time.perf_counter()",
        "cache_miss_latency_ms": miss_lat,
        "cache_miss_wall_ms": miss_wall,
        "exact_repeat_latency_ms": exact_lat,
        "exact_repeat_wall_ms": exact_wall,
        "exact_repeat_cache_hit": exact_meta.get("cache_hit", False),
        "exact_speedup_factor": exact_speedup,
        "paraphrase_latency_ms": para_lat,
        "paraphrase_wall_ms": para_wall,
        "paraphrase_cache_hit": para_meta.get("cache_hit", False),
        "paraphrase_similarity": para_meta.get("cache_similarity", 0.0),
        "similarity_method": "Token Jaccard (NOT embedding-based semantics)",
    }

    print(f"Cache Miss Latency:                     {miss_lat} ms (wall: {miss_wall} ms)")
    print(f"Exact Repeat Latency (cache hit):       {exact_lat} ms (speedup: {exact_speedup}x)")
    print(f"Paraphrase Latency (Jaccard match):     {para_lat} ms | Hit: {para_meta.get('cache_hit')} | Sim: {para_meta.get('cache_similarity', 0.0)}")
    print("=" * 80 + "\n")

    threshold_audit = run_threshold_experiment()
    edge_audit = await evaluate_edge_cases()

    url_leak_summary = {
        "cases_scanned": len(responses_list),
        "fields_scanned": total_fields_scanned,
        "leaks_found": len(url_leaks_found),
        "leak_details": url_leaks_found,
        "measurement": "MEASURED — scanned all text fields in all 20 generated responses",
    }

    deeplink_summary = {
        "catalog_size": len(catalog_uris),
        "total_actionable_deeplinks_generated": total_actionable_dls,
        "catalog_backed_count": catalog_backed_count,
        "dummy_fallback_count": dummy_fallback_count,
        "invalid_uri_count": invalid_uri_count,
        "note": (
            "catalog_backed_count = URIs verified in official 578-entry catalog. "
            "dummy_fallback_count = bixby://dummy_positive (official contract fallback, NOT a catalog entry). "
            "invalid_uri_count should always be 0."
        ),
        "measurement": "MEASURED",
    }

    summary = {
        "evaluation_metadata": {
            "description": "20-case benchmark evaluation of Samsung Guided Troubleshooting Engine",
            "timing_method": "time.perf_counter()",
            "gemini_note": (
                "Gemini success count reflects live API calls. When GEMINI_API_KEY is absent "
                "or quota is exceeded, deterministic_fallback_used=True for all cases."
            ),
            "threshold_note": (
                "Threshold experiment measures candidate retrieval rate, NOT semantic accuracy. "
                "No ground-truth relevance labels were available."
            ),
        },
        "total_cases": len(responses_list),
        "valid_schema_cases": valid_schema_count,
        "schema_pass_rate_pct": round(valid_schema_count / len(responses_list) * 100, 2),
        "official_catalog_membership_pct": round(all_dls_in_catalog_count / len(responses_list) * 100, 2),
        "gemini_generation_success_count": gemini_succeeded_count,
        "deterministic_fallback_count": fallback_used_count,
        "total_actions_generated": total_actions_count,
        "total_step_groups_generated": total_step_groups_count,
        "total_steps_generated": total_steps_count,
        "deeplink_breakdown": deeplink_summary,
        "url_leak_audit": url_leak_summary,
        "latency_metrics": {
            "average_local_pipeline_latency_ms": avg_local_lat,
            "average_gemini_api_latency_ms": avg_gemini_lat,
            "total_evaluation_runtime_sec": total_duration,
            "measurement": "MEASURED via time.perf_counter()",
            "note": (
                "Local pipeline latency reflects deterministic TF-IDF path. "
                "Gemini latency is 0.0 ms when key is absent (no API call made)."
            ),
        },
        "cache_evaluation": cache_metrics,
        "edge_cases_audit": edge_audit,
        "threshold_audit_summary": threshold_audit,
        "case_details": results,
    }

    print("=" * 80)
    print("EVALUATION & BENCHMARK SUMMARY REPORT")
    print("=" * 80)
    print(f"Total Cases Evaluated:                  {summary['total_cases']}")
    print(f"Schema Pass Rate (Structure Valid):     {summary['valid_schema_cases']} / {summary['total_cases']} ({summary['schema_pass_rate_pct']}%)")
    print(f"Official Catalog Deeplink Membership:   {summary['official_catalog_membership_pct']}%")
    print(f"  Catalog-backed URIs:                  {catalog_backed_count}")
    print(f"  Dummy fallback URIs:                  {dummy_fallback_count}")
    print(f"  Invalid URIs:                         {invalid_uri_count} (should be 0)")
    print(f"URL Leaks Found (across all 20 cases):  {url_leak_summary['leaks_found']} (fields scanned: {url_leak_summary['fields_scanned']})")
    print(f"Gemini LLM Successes:                   {summary['gemini_generation_success_count']} / {summary['total_cases']}")
    print(f"Deterministic Fallback Invocations:     {summary['deterministic_fallback_count']} / {summary['total_cases']}")
    print(f"Total Actions Generated:                {summary['total_actions_generated']}")
    print(f"Total Steps Generated:                  {summary['total_steps_generated']}")
    print(f"Total Actionable Deeplinks:             {total_actionable_dls}")
    print(f"Average Local Pipeline Latency:         {avg_local_lat:.2f} ms  [MEASURED]")
    print(f"Average Gemini API Latency:             {avg_gemini_lat:.2f} ms  [MEASURED]")
    print(f"Total Evaluation Runtime:               {total_duration:.2f} seconds")
    print("=" * 80)

    output_dir = PROJECT_ROOT / "scripts" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    report_file = output_dir / "evaluation_report.json"
    report_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\nSaved full evaluation report to: {report_file}")

    return summary


if __name__ == "__main__":
    asyncio.run(run_evaluation())
