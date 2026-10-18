import sys
from pathlib import Path
import pytest

# Ensure milk-fever-module root is on the Python path
MODULE_ROOT = Path(__file__).resolve().parents[1]
if str(MODULE_ROOT) not in sys.path:
    sys.path.insert(0, str(MODULE_ROOT))

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ==============================================================================
# Scenario 1: Valid input
# Verifies successful prediction under standard healthy/subclinical conditions
# ==============================================================================
def test_scenario_1_valid_input(client):
    payload = {
        "parity": 2,
        "calving_date": "2026-10-15",
        "bcs": 3.0,
        "eating": 90,
        "behavioral": "normal",
        "cannot_stand": False,
        "muscle_tremors": False,
        "cold_ears": False,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["disease"] == "Milk Fever (Bovine Hypocalcemia)"
    assert data["stage"] in ["Subclinical", "Mild", "Moderate", "Critical"]
    assert "risk_score" in data
    assert "advice" in data
    assert data["requires_vet_report"] is False or data["stage"] == "Critical"
    assert data["used_lab_values"] is False


# ==============================================================================
# Scenario 2: Incomplete / invalid input
# Verifies data validation handling and error responses
# ==============================================================================
def test_scenario_2_incomplete_input(client):
    # Case A: Missing JSON body
    empty_res = client.post("/predict", data="invalid non-json")
    assert empty_res.status_code == 400
    assert "error" in empty_res.get_json()

    # Case B: Out-of-range or malformed validation fields
    invalid_res = client.post(
        "/predict",
        json={"parity": "invalid_parity_value", "blood_calcium_lab": 99.0},
    )
    assert invalid_res.status_code == 422
    data = invalid_res.get_json()
    assert data["error"] == "Validation failed"
    assert len(data["details"]) > 0


# ==============================================================================
# Scenario 3: Critical stage warning
# Verifies emergency handling, recumbency triggers, and vet handover warning
# ==============================================================================
def test_scenario_3_critical_stage_warning(client):
    critical_payload = {
        "parity": 5,
        "calving_date": "2026-10-10",
        "bcs": 2.0,
        "eating": 5,
        "behavioral": "unable_to_stand",
        "cannot_stand": True,
        "muscle_tremors": True,
        "cold_ears": True,
        "blood_calcium_lab": 4.2,
    }
    response = client.post("/predict", json=critical_payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["stage"] == "Critical"
    assert data["risk_score"] >= 70
    assert data["requires_vet_report"] is True
    assert "CRITICAL" in data["advice"] or "veterinary" in data["advice"].lower()
    assert "warning_factors" in data["explanation"]


# ==============================================================================
# Scenario 4: Frontend to API call
# Verifies end-to-end integration schema matching the frontend form payload
# ==============================================================================
def test_scenario_4_frontend_to_api_call(client):
    frontend_payload = {
        "data": {
            "parity": 3,
            "calving_date": "2026-10-20",
            "behavioral": "reduced_movement",
            "eating": "60",
            "bcs": 3.5,
            "cannot_stand": False,
            "muscle_tremors": False,
            "excessive_drooling": False,
            "cold_ears": False,
            "cow_id": "COW-102",
        },
        "thi": 75,
    }
    response = client.post("/predict", json=frontend_payload)
    assert response.status_code == 200

    data = response.get_json()
    assert "stage" in data
    assert "risk_score" in data
    assert data["thi_adjustment"] >= 0
    assert "feature_values" in data
    assert data["feature_values"]["parity"] == 3
