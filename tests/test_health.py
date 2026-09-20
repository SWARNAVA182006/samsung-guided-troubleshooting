import sys
from pathlib import Path

# Ensure ai-gateway path is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
AI_GATEWAY_PATH = PROJECT_ROOT / "ai-gateway"
if str(AI_GATEWAY_PATH) not in sys.path:
    sys.path.insert(0, str(AI_GATEWAY_PATH))

from fastapi.testclient import TestClient
from app.main import app
from app.data_loader import load_siis_responses

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_troubleshoot_valid_strict_request_executes_pipeline() -> None:
    """Verify official Theme 2 request payload (query + siis_response) is accepted and processed by AI Gateway."""
    siis_data = load_siis_responses()
    sample_row = siis_data["responses"][0]

    valid_payload = {
        "query": sample_row["original_query"],
        "siis_response": sample_row["siis_response"],
    }

    response = client.post("/v1/troubleshoot", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    assert "contexts" in data
    assert len(data["contexts"]) > 0
    assert len(data["contexts"][0]["actions"]) > 0
    # Verify score is bounded in [0.0, 1.0] and non-static
    score = data["contexts"][0]["score"]
    assert 0.0 <= score <= 1.0


def test_troubleshoot_missing_query_returns_422() -> None:
    """Verify request missing required 'query' field is rejected with 422."""
    siis_data = load_siis_responses()
    sample_siis_payload = siis_data["responses"][0]["siis_response"]

    response = client.post("/v1/troubleshoot", json={"siis_response": sample_siis_payload})
    assert response.status_code == 422


def test_troubleshoot_missing_siis_response_returns_422() -> None:
    """Verify request missing required 'siis_response' object is rejected with 422."""
    response = client.post("/v1/troubleshoot", json={"query": "Device screen is black"})
    assert response.status_code == 422


def test_troubleshoot_invalid_permissive_structures_rejected_with_422() -> None:
    """Verify permissive/loose legacy structures are rejected with 422."""
    res1 = client.post("/v1/troubleshoot", json={})
    assert res1.status_code == 422

    res2 = client.post(
        "/v1/troubleshoot",
        json={"original_query": "Screen issue", "siis_response": {"title": "T", "content": "C"}},
    )
    assert res2.status_code == 422
