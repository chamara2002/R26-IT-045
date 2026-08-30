import io
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.app import app
import src.app as app_module
from weather.weather_routes import location_store

BASE_DIR = Path(__file__).resolve().parents[1]
DISEASED_IMAGE = BASE_DIR / "models" / "dataset" / "1" / "Diseased tongue 1.jpg"
HEALTHY_IMAGE = BASE_DIR / "models" / "dataset" / "0" / "Non-diseased muzzle 10.jpg"


def _valid_image_bytes():
    with open(HEALTHY_IMAGE, "rb") as f:
        return f.read()


def _white_image_bytes():
    image = np.zeros((160, 160, 3), dtype=np.uint8)
    image[:] = (255, 255, 255)
    _, image_bytes = cv2.imencode(".jpg", image)
    return image_bytes.tobytes()


# ─── Basic contract ──────────────────────────────────────────────────────

def test_missing_image_returns_400():
    client = app.test_client()
    response = client.post("/api/predict/assisted", data={"symptoms": "{}"})
    assert response.status_code == 400
    assert "No image provided" in response.get_json()["error"]


def test_weather_dashboard_page_renders():
    client = app.test_client()
    response = client.get("/weather/dashboard")

    assert response.status_code == 200
    assert "Weather-based FMD Novelty Dashboard" in response.get_data(as_text=True)


def test_image_only_endpoint_missing_image_returns_400():
    client = app.test_client()
    response = client.post("/api/predict/image", data={})
    assert response.status_code == 400
    assert "No image provided" in response.get_json()["error"]


def test_image_only_endpoint_returns_prediction_payload():
    client = app.test_client()
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(_valid_image_bytes()), "test.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert set(["disease", "predicted_label", "risk_level", "confidence", "advice"]).issubset(payload.keys())


def test_valid_image_returns_prediction_payload():
    client = app.test_client()

    data = {
        "symptoms": "{\"high_fever\": true, \"lesions_in_mouth\": true}",
        "body_temperature": "39.5",
    }
    response = client.post(
        "/api/predict/assisted",
        data={**data, "image": (io.BytesIO(_valid_image_bytes()), "test.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert set(["disease", "predicted_label", "risk_level", "confidence", "advice"]).issubset(payload.keys())


def test_blank_image_returns_400_anatomical_error():
    client = app.test_client()
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(_white_image_bytes()), "blank.jpg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert "error" in payload
    assert "blank" in payload["error"].lower() or "tissue" in payload["error"].lower()


def test_grass_pasture_image_returns_400_anatomical_error():
    client = app.test_client()
    img_grass = np.random.randint(50, 150, (160, 160, 3), dtype=np.uint8)
    img_grass[:, :, 1] = np.random.randint(180, 240, (160, 160))
    img_grass[:, :, 0] = np.random.randint(20, 60, (160, 160))
    img_grass[:, :, 2] = np.random.randint(20, 60, (160, 160))
    _, b_grass = cv2.imencode(".jpg", img_grass)

    response = client.post(
        "/api/predict/assisted",
        data={"image": (io.BytesIO(b_grass.tobytes()), "pasture.jpg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert "pasture" in payload["error"].lower() or "tissue" in payload["error"].lower()


def test_sky_background_image_returns_400_anatomical_error():
    client = app.test_client()
    img_sky = np.random.randint(200, 255, (160, 160, 3), dtype=np.uint8)
    img_sky[:, :, 0] = np.random.randint(180, 255, (160, 160))
    img_sky[:, :, 1] = np.random.randint(100, 160, (160, 160))
    img_sky[:, :, 2] = np.random.randint(0, 50, (160, 160))
    _, b_sky = cv2.imencode(".jpg", img_sky)

    response = client.post(
        "/api/predict/assisted",
        data={"image": (io.BytesIO(b_sky.tobytes()), "sky.jpg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert "scenery" in payload["error"].lower() or "tissue" in payload["error"].lower()


# ─── Image edge cases ────────────────────────────────────────────────────

def test_real_fmd_image_predicts_positive():
    client = app.test_client()
    with open(DISEASED_IMAGE, "rb") as f:
        response = client.post(
            "/api/predict/image",
            data={"image": (io.BytesIO(f.read()), "diseased.jpg")},
            content_type="multipart/form-data",
        )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["predicted_label"] == "1"


def test_real_non_fmd_image_predicts_negative():
    client = app.test_client()
    with open(HEALTHY_IMAGE, "rb") as f:
        response = client.post(
            "/api/predict/image",
            data={"image": (io.BytesIO(f.read()), "healthy.jpg")},
            content_type="multipart/form-data",
        )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["predicted_label"] == "0"


def test_corrupted_image_returns_controlled_error():
    client = app.test_client()
    truncated_jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 20  # JPEG header only, no data
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(truncated_jpeg), "corrupt.jpg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_invalid_non_image_file_returns_controlled_error():
    client = app.test_client()
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(b"this is not an image, just text"), "notes.txt")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_empty_upload_returns_400():
    client = app.test_client()
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(b""), "empty.jpg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "No image provided" in response.get_json()["error"]


def test_large_image_is_handled():
    client = app.test_client()
    with open(HEALTHY_IMAGE, "rb") as f:
        img_bytes = f.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    large_img = cv2.resize(img, (1500, 1500))
    _, image_bytes = cv2.imencode(".jpg", large_img)
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(image_bytes.tobytes()), "large.jpg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert "predicted_label" in response.get_json()


# ─── Location: district-based, no browser GPS ───────────────────────────

def test_district_location_can_be_set_and_changed():
    client = app.test_client()
    farmer_id = "pytest_location_farmer"

    resp1 = client.post("/weather/location", json={"farmer_id": farmer_id, "district": "Anuradhapura"})
    assert resp1.status_code == 200
    assert resp1.get_json()["district"] == "Anuradhapura"

    get1 = client.get(f"/weather/location?farmer_id={farmer_id}")
    assert get1.get_json()["district"] == "Anuradhapura"

    resp2 = client.post("/weather/location", json={"farmer_id": farmer_id, "district": "Colombo"})
    assert resp2.status_code == 200
    assert resp2.get_json()["district"] == "Colombo"

    get2 = client.get(f"/weather/location?farmer_id={farmer_id}")
    assert get2.get_json()["district"] == "Colombo"
    assert get2.get_json()["latitude"] != get1.get_json()["latitude"]


def test_unknown_district_returns_400():
    client = app.test_client()
    response = client.post("/weather/location", json={"farmer_id": "x", "district": "Atlantis"})
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_missing_location_returns_404():
    client = app.test_client()
    response = client.get("/weather/location?farmer_id=pytest_never_set_this_farmer")
    assert response.status_code == 404


def test_current_risk_without_saved_location_returns_400():
    client = app.test_client()
    response = client.get("/weather/current-risk?farmer_id=pytest_never_set_this_farmer_2")
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_weather_api_failure_does_not_break_image_prediction(monkeypatch):
    client = app.test_client()
    farmer_id = "pytest_weather_failure_farmer"
    location_store.save_location(farmer_id, 8.3114, 80.4037, district="Anuradhapura")

    def _boom(*args, **kwargs):
        raise RuntimeError("Weather API unavailable: simulated failure")

    monkeypatch.setattr(app_module.weather_service, "get_current_weather_risk", _boom)

    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(_valid_image_bytes()), "test.jpg"), "farmer_id": farmer_id},
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert "predicted_label" in payload
    assert payload["weather_risk"]["available"] is False
    assert "unavailable" in payload["weather_risk"]["message"].lower()


# ─── Hybrid image + weather combinations ─────────────────────────────────

@pytest.mark.parametrize(
    "image_path,weather_level,expected_overall",
    [
        (DISEASED_IMAGE, "HIGH", "HIGH CONCERN"),
        (DISEASED_IMAGE, "MEDIUM", "HIGH CONCERN"),
        (DISEASED_IMAGE, "LOW", "POSSIBLE FMD"),
        (HEALTHY_IMAGE, "HIGH", "ELEVATED ENVIRONMENTAL RISK"),
        (HEALTHY_IMAGE, "MEDIUM", "MODERATE ENVIRONMENTAL RISK"),
        (HEALTHY_IMAGE, "LOW", "LOW CURRENT CONCERN"),
    ],
)
def test_hybrid_decision_table(monkeypatch, image_path, weather_level, expected_overall):
    """This test is about hybrid.py's decision table in isolation, so the
    DAPH seasonal escalation (tested separately below) is neutralized here --
    otherwise this test would only be reliable outside Dec-Feb, since the
    real calendar date would silently change environmental_level."""
    client = app.test_client()
    farmer_id = f"pytest_hybrid_{weather_level.lower()}"
    location_store.save_location(farmer_id, 8.3114, 80.4037, district="Anuradhapura")

    def _fake_weather(*args, **kwargs):
        return {
            "risk_level": weather_level,
            "rainfall": 5.0,
            "temperature": 27.0,
            "humidity": 70.0,
        }

    def _passthrough_environmental_risk(current_date, weather_risk):
        return {
            "weather_risk": weather_risk,
            "seasonal_active": False,
            "seasonal_period": "December–February",
            "environmental_risk": weather_risk,
            "seasonal_explanation": "seasonal escalation neutralized for this test",
            "seasonal_disclaimer": "test",
            "seasonal_source": "test",
        }

    monkeypatch.setattr(app_module.weather_service, "get_current_weather_risk", _fake_weather)
    monkeypatch.setattr(app_module.weather_store, "save_daily_record", lambda *a, **k: None)
    monkeypatch.setattr(app_module, "compute_environmental_risk", _passthrough_environmental_risk)

    with open(image_path, "rb") as f:
        response = client.post(
            "/api/predict/image",
            data={"image": (io.BytesIO(f.read()), "test.jpg"), "farmer_id": farmer_id},
            content_type="multipart/form-data",
        )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["weather_risk"]["level"] == weather_level
    assert payload["weather_risk"]["environmental_level"] == weather_level
    assert payload["hybrid_assessment"]["overall_assessment"] == expected_overall
    assert payload["hybrid_assessment"]["explanation"]  # non-empty, explains why


# ─── DAPH seasonal escalation integration ────────────────────────────────

def test_seasonal_escalation_changes_hybrid_outcome_when_active(monkeypatch):
    """Proves environmental_level (not raw weather level) is what actually
    reaches hybrid.py: force weather=LOW but seasonal-escalated to MEDIUM,
    and confirm the hybrid result matches MEDIUM's row, not LOW's."""
    client = app.test_client()
    farmer_id = "pytest_seasonal_active_farmer"
    location_store.save_location(farmer_id, 8.3114, 80.4037, district="Anuradhapura")

    monkeypatch.setattr(
        app_module.weather_service,
        "get_current_weather_risk",
        lambda *a, **k: {"risk_level": "LOW", "rainfall": 1.0, "temperature": 27.0, "humidity": 60.0},
    )
    monkeypatch.setattr(app_module.weather_store, "save_daily_record", lambda *a, **k: None)
    monkeypatch.setattr(
        app_module,
        "compute_environmental_risk",
        lambda current_date, weather_risk: {
            "weather_risk": weather_risk,
            "seasonal_active": True,
            "seasonal_period": "December–February",
            "environmental_risk": "MEDIUM",  # escalated from LOW
            "seasonal_explanation": "within the historical Dec-Feb window (test)",
            "seasonal_disclaimer": "test disclaimer",
            "seasonal_source": "DAPH Sri Lanka Annual Report 2022",
        },
    )

    with open(DISEASED_IMAGE, "rb") as f:
        response = client.post(
            "/api/predict/image",
            data={"image": (io.BytesIO(f.read()), "test.jpg"), "farmer_id": farmer_id},
            content_type="multipart/form-data",
        )

    assert response.status_code == 200
    payload = response.get_json()
    # Raw weather risk is not hidden...
    assert payload["weather_risk"]["level"] == "LOW"
    # ...but the hybrid decision follows the escalated environmental risk (MEDIUM), not LOW.
    assert payload["weather_risk"]["environmental_level"] == "MEDIUM"
    assert payload["weather_risk"]["seasonal_active"] is True
    assert payload["weather_risk"]["seasonal_source"] == "DAPH Sri Lanka Annual Report 2022"
    assert payload["hybrid_assessment"]["overall_assessment"] == "HIGH CONCERN"  # positive image + MEDIUM row
    assert payload["hybrid_assessment"]["weather_risk_level"] == "MEDIUM"


def test_seasonal_context_present_even_when_weather_unavailable():
    """Seasonal context only depends on the date, so it should still be
    returned even when the farmer has no saved location at all."""
    client = app.test_client()
    response = client.post(
        "/api/predict/image",
        data={"image": (io.BytesIO(_valid_image_bytes()), "test.jpg"), "farmer_id": "pytest_no_location_farmer"},
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    weather = response.get_json()["weather_risk"]
    assert weather["available"] is False
    assert weather["environmental_level"] is None
    assert weather["seasonal_period"] == "December–February"
    assert weather["seasonal_explanation"]
    assert weather["seasonal_disclaimer"]


def test_current_risk_endpoint_includes_seasonal_fields():
    client = app.test_client()
    farmer_id = "pytest_seasonal_current_risk_farmer"
    location_store.save_location(farmer_id, 8.3114, 80.4037, district="Anuradhapura")
    response = client.get(f"/weather/current-risk?farmer_id={farmer_id}")
    assert response.status_code == 200
    payload = response.get_json()
    # Original fields must not be removed/renamed (no breaking existing frontend code).
    assert "risk_level" in payload
    assert "temperature" in payload
    # New seasonal fields are additive.
    for key in ("seasonal_active", "seasonal_period", "environmental_risk", "seasonal_explanation", "seasonal_disclaimer"):
        assert key in payload


# ─── PDF Report Generation ──────────────────────────────────────────────

def test_fmd_pdf_report_generation():
    client = app.test_client()
    sample_payload = {
        "result": {
            "disease": "Foot and Mouth Disease",
            "predicted_label": "1",
            "risk_level": "High",
            "confidence": "85.0%",
            "confidence_score": 0.85,
            "recommendation": "Isolate suspect animal immediately and notify local VS.",
            "hybrid_assessment": {
                "image_result": "FMD-consistent lesions detected",
                "overall_assessment": "HIGH CONCERN",
            },
            "weather_risk": {
                "available": True,
                "level": "HIGH",
                "temperature": 28.5,
                "humidity": 78.0,
                "rainfall": 4.2,
                "seasonal_active": True,
            },
        },
        "cattle_info": {
            "tag_id": "LK-045",
            "name": "Bessie",
            "breed": "Sahiwal Cross",
            "age": 3,
        },
        "district": "Anuradhapura",
    }
    response = client.post("/api/report/pdf", json=sample_payload)
    assert response.status_code == 200
    assert response.headers.get("Content-Type") == "application/pdf"
    assert response.data.startswith(b"%PDF")
    assert len(response.data) > 1000


def test_fmd_pdf_report_missing_payload_returns_400():
    client = app.test_client()
    response = client.post("/api/report/pdf", json={})
    assert response.status_code == 400
    assert "error" in response.get_json()

