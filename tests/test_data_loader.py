"""Unit and dataset-integrity tests for the read-only data loader and schema models."""
import hashlib
import sys
from pathlib import Path
import pytest

# Ensure ai-gateway is in Python path for test execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
AI_GATEWAY_PATH = PROJECT_ROOT / "ai-gateway"
if str(AI_GATEWAY_PATH) not in sys.path:
    sys.path.insert(0, str(AI_GATEWAY_PATH))

from app.models import ContextDeeplinkResponse
from app.data_loader import (
    DATA_DIR,
    load_deeplinks,
    load_input_text,
    load_sample_output,
    load_siis_responses,
)


OFFICIAL_FILES = [
    "schema.py",
    "deeplinks.json",
    "input.txt",
    "sample_output.json",
    "siis_responses.json",
]


def test_official_files_exist():
    """Verify that all five official Samsung files exist in the data/ directory."""
    for filename in OFFICIAL_FILES:
        file_path = DATA_DIR / filename
        assert file_path.exists(), f"Official file missing: {filename}"
        assert file_path.stat().st_size > 0, f"Official file is empty: {filename}"


def test_load_siis_responses_success():
    """Verify siis_responses.json loads successfully and is non-empty."""
    data = load_siis_responses()
    assert isinstance(data, dict)
    assert len(data) > 0
    assert "responses" in data
    assert len(data["responses"]) > 0


def test_load_deeplinks_success():
    """Verify deeplinks.json loads successfully and is non-empty."""
    data = load_deeplinks()
    assert isinstance(data, dict)
    assert len(data) > 0
    assert "deeplinks" in data
    assert len(data["deeplinks"]) > 0


def test_load_sample_output_success():
    """Verify sample_output.json loads successfully and is non-empty."""
    data = load_sample_output()
    assert isinstance(data, dict)
    assert "query" in data
    assert "response" in data
    assert len(data["query"]) > 0


def test_load_input_text_success():
    """Verify input.txt loads successfully and contains text."""
    text = load_input_text()
    assert isinstance(text, str)
    assert len(text.strip()) > 0


def test_loader_does_not_mutate_source_data():
    """Verify that loading operations do not modify file hashes or contents on disk."""
    file_hashes_before = {}
    for filename in OFFICIAL_FILES:
        path = DATA_DIR / filename
        file_hashes_before[filename] = hashlib.sha256(path.read_bytes()).hexdigest()

    # Trigger all data loading functions
    _ = load_siis_responses()
    _ = load_deeplinks()
    _ = load_sample_output()
    _ = load_input_text()

    for filename in OFFICIAL_FILES:
        path = DATA_DIR / filename
        hash_after = hashlib.sha256(path.read_bytes()).hexdigest()
        assert hash_after == file_hashes_before[filename], f"File modified: {filename}"


def test_dataset_integrity_deeplinks_count():
    """Dataset-integrity test: Verify deeplinks dataset contains exactly 578 entries."""
    data = load_deeplinks()
    assert data.get("count") == 578
    assert len(data.get("deeplinks", [])) == 578


def test_dataset_integrity_siis_count():
    """Dataset-integrity test: Verify SIIS dataset contains exactly 20 entries."""
    data = load_siis_responses()
    assert data.get("count") == 20
    assert len(data.get("responses", [])) == 20


def test_sample_output_schema_validation():
    """Validate sample_output.json against ContextDeeplinkResponse model.

    Note: sample_output.json has an outer API wrapper containing top-level keys 'query'
    and 'response'. The inner 'response' object is the RAG payload matching ContextDeeplinkResponse.
    We do NOT force the outer 'query'/'response' wrapper into ContextDeeplinkResponse, but
    validate the inner 'response' structure directly.
    """
    sample_data = load_sample_output()
    assert "query" in sample_data, "Outer wrapper expected to contain 'query'"
    assert "response" in sample_data, "Outer wrapper expected to contain 'response'"

    response_payload = sample_data["response"]
    response_obj = ContextDeeplinkResponse.model_validate(response_payload)
    assert len(response_obj.contexts) == 1

    goal = response_obj.contexts[0]
    assert goal.title == "Screen display damage"
    assert goal.score == 0.95
    assert len(goal.actions) == 2
