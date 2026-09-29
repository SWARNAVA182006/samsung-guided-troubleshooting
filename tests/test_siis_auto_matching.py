"""Comprehensive test suite for Normal User Mode, Auto SIIS Retrieval, State Contamination Prevention, Clarification, and All 20 Official Benchmark Cases.
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AI_GATEWAY_PATH = PROJECT_ROOT / "ai-gateway"
if str(AI_GATEWAY_PATH) not in sys.path:
    sys.path.insert(0, str(AI_GATEWAY_PATH))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.data_loader import load_siis_responses, load_deeplinks
from app.validator import GOAL_REGEX

client = TestClient(app)

catalog = load_deeplinks().get("deeplinks", [])
official_uris = {item["deeplink"] for item in catalog}
official_val_uris = {
    item["validation"]["deeplink"]
    for item in catalog
    if item.get("validation") and isinstance(item["validation"], dict) and item["validation"].get("deeplink")
}
all_official_uris = official_uris | official_val_uris


def test_green_lines_normal_mode_no_email_contamination() -> None:
    """Requirement: 'green lines on my phone screen' in normal mode must NOT inherit Email SIIS."""
    response = client.post(
        "/v1/troubleshoot",
        json={"query": "green lines on my phone screen"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "contexts" in data and len(data["contexts"]) > 0

    goal = data["contexts"][0]
    # Verify NO Email contamination
    assert "email" not in goal["title"].lower()
    assert "email" not in goal["goal"].lower()

    for action in goal["actions"]:
        assert "email" not in action["actionName"].lower()
        for sg in action["stepGroups"]:
            for step in sg["steps"]:
                assert "gmail" not in step.lower()
                assert "email app" not in step.lower()


def test_ambiguous_query_clarification() -> None:
    """Requirement: Ambiguous query triggers safe clarification response."""
    response = client.post(
        "/v1/troubleshoot",
        json={"query": "an intentionally ambiguous complaint"},
    )
    assert response.status_code == 200
    data = response.json()
    goal = data["contexts"][0]
    assert goal["score"] <= 0.15
    assert "Clarification" in goal["title"] or "Clarification" in goal["goal"]
    assert len(goal["actions"]) > 0


def test_unrelated_query_clarification() -> None:
    """Requirement: Unrelated query triggers safe clarification response."""
    response = client.post(
        "/v1/troubleshoot",
        json={"query": "how to bake a chocolate cake at home"},
    )
    assert response.status_code == 200
    data = response.json()
    goal = data["contexts"][0]
    assert goal["score"] <= 0.15
    assert "Clarification" in goal["title"] or "Clarification" in goal["goal"]


def test_sequential_state_contamination_isolation() -> None:
    """Requirement: Running an Email benchmark request must not contaminate a subsequent normal query."""
    siis_data = load_siis_responses()
    email_sample = siis_data["responses"][0]  # Row 1 Email case

    # Request A: Email benchmark
    resp1 = client.post(
        "/v1/troubleshoot",
        json={
            "query": email_sample["original_query"],
            "siis_response": email_sample["siis_response"],
        },
    )
    assert resp1.status_code == 200

    # Request B: Fresh normal mode query
    resp2 = client.post(
        "/v1/troubleshoot",
        json={"query": "green lines on my phone screen"},
    )
    assert resp2.status_code == 200
    goal2 = resp2.json()["contexts"][0]
    assert "email" not in goal2["title"].lower()
    assert "email" not in goal2["goal"].lower()


def test_all_20_official_siis_cases_contract_compliance() -> None:
    """Requirement: Run ALL 20 official SIIS benchmark cases and verify 100% contract compliance."""
    siis_data = load_siis_responses()
    responses_list = siis_data["responses"]
    assert len(responses_list) == 20

    for idx, case in enumerate(responses_list):
        query = case["original_query"]
        siis = case["siis_response"]

        resp = client.post(
            "/v1/troubleshoot",
            json={"query": query, "siis_response": siis},
        )
        assert resp.status_code == 200, f"Failed on case {case['id']}"
        data = resp.json()
        assert len(data["contexts"]) > 0, f"No contexts returned for case {case['id']}"

        goal = data["contexts"][0]
        # 1. Goal format regex
        assert GOAL_REGEX.match(goal["goal"]), f"Invalid goal string in case {case['id']}: {goal['goal']}"
        # 2. Title word count (2-3 words)
        title_words = len(goal["title"].split())
        assert 2 <= title_words <= 3, f"Title word count error in case {case['id']}: '{goal['title']}' ({title_words} words)"
        # 3. Score bounded in [0.0, 1.0]
        assert 0.0 <= goal["score"] <= 1.0, f"Invalid score in case {case['id']}: {goal['score']}"
        # 4. Actions non-empty
        assert len(goal["actions"]) > 0, f"No actions in case {case['id']}"

        for act in goal["actions"]:
            # Action description starts with 'It will' and has 5-7 words
            assert act["description"].startswith("It will"), f"Action description does not start with 'It will' in case {case['id']}: {act['description']}"
            desc_words = len(act["description"].split())
            assert 5 <= desc_words <= 7, f"Action description length error in case {case['id']}: '{act['description']}' ({desc_words} words)"
            # Step groups non-empty
            assert len(act["stepGroups"]) > 0, f"Empty stepGroups in case {case['id']}"
            for sg in act["stepGroups"]:
                assert len(sg["steps"]) > 0, f"Empty steps in case {case['id']}"
                # Deeplink validity
                if sg.get("actionableDeeplink"):
                    uri = sg["actionableDeeplink"]["deeplink"]
                    assert uri in all_official_uris, f"Actionable deeplink not in catalog: {uri}"
                if sg.get("validationDeeplink"):
                    val_uri = sg["validationDeeplink"]["deeplink"]
                    assert val_uri in all_official_uris, f"Validation deeplink not in catalog: {val_uri}"
