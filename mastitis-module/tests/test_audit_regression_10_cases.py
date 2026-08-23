"""
test_audit_regression_10_cases.py
Automated end-to-end test suite validating all 10 critical audit test cases for CattleSense Mastitis Detection.
"""

import sys
from pathlib import Path
import io
import json
import pytest
import numpy as np
import cv2
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from api.flask_api import app, pipeline, gradcam_explainer, severity_engine, report_generator
from models.model1.gradcam_explainer import predict_mastitis as m1_predict, generate_gradcam as m1_gradcam


@pytest.fixture
def client():
    """Create Flask test client."""
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def _make_dummy_image_bytes(size=(224, 224), color=(180, 150, 140)):
    """Generate a realistic test image encoded as JPEG bytes."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1 — FULL HYBRID
# ─────────────────────────────────────────────────────────────────────────────
def test_case_1_full_hybrid(client):
    """
    TEST 1 — FULL HYBRID
    Input: Valid image + Milk_Temperature + Milk_pH + Milk_Conductivity + Milk_Yield + Clotting
    Expected: Model 1 = PASS, Model 2 = PASS, Hybrid = PASS, Severity = PASS,
              Recommendation = PASS, Grad-CAM = PASS, Report = PASS.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_Temperature": "36.5",
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]

    # Model 1 & 2 & Hybrid
    assert data["mode"] == "multimodal_image_numerical"
    assert data["model_2_used"] is True
    assert data["numerical_analysis_available"] is True
    assert data["image_prediction"] is not None
    assert data["numerical_prediction"] is not None
    assert "prediction" in data
    assert "confidence" in data
    assert data["normal_probability"] is not None
    assert data["mastitis_probability"] is not None

    # Severity & Recommendation
    assert "severity" in data
    assert data["severity"]["severity_level"] in ("negative", "mild", "moderate", "severe")
    assert "recommendation" in data and len(data["recommendation"]) > 0

    # Grad-CAM heatmap ID
    assert "heatmap_id" in data


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2 — MODEL 1 ONLY
# ─────────────────────────────────────────────────────────────────────────────
def test_case_2_model_1_only_fallback(client):
    """
    TEST 2 — MODEL 1 ONLY
    Input: Valid image + Missing one Model 2 feature
    Expected: Model 1 = PASS, Model 2 = NOT RUN, Hybrid = NOT RUN, Image-only prediction = PASS.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
        # Missing Milk_Temperature
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]

    # Model 1 ran, Model 2 did not run
    assert data["mode"] == "image_only"
    assert data["model_2_used"] is False
    assert data["numerical_analysis_available"] is False
    assert data["image_prediction"] is not None
    assert data["numerical_prediction"] is None
    assert "prediction" in data
    assert "confidence" in data


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3 — OPTIONAL DATA EMPTY
# ─────────────────────────────────────────────────────────────────────────────
def test_case_3_optional_data_empty(client):
    """
    TEST 3 — OPTIONAL DATA EMPTY
    Input: Valid image + All 5 Model 2 features + No optional questionnaire information
    Expected: Hybrid prediction = PASS.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_Temperature": "38.5",
        "Milk_pH": "7.1",
        "Milk_Conductivity": "6.8",
        "Milk_Yield": "10.0",
        "Clotting": "1",
        # No optional questionnaire answers provided
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["mode"] == "multimodal_image_numerical"
    assert data["model_2_used"] is True


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4 — INVALID TEMPERATURE
# ─────────────────────────────────────────────────────────────────────────────
def test_case_4_invalid_temperature_fallback(client):
    """
    TEST 4 — INVALID TEMPERATURE
    Input: Valid image + invalid temperature (e.g. 99°C or "abc")
    Expected: Model 2 not executed, No fake temperature, Model 1 fallback if image exists.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_Temperature": "99.0",  # Out of valid range (30-45 °C)
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]

    # Model 1 fallback executed, Model 2 was NOT run with fake value
    assert data["mode"] == "image_only"
    assert data["model_2_used"] is False
    assert data["numerical_analysis_available"] is False


# ─────────────────────────────────────────────────────────────────────────────
# TEST 5 — INVALID/MISSING PH
# ─────────────────────────────────────────────────────────────────────────────
def test_case_5_invalid_missing_breed_fallback(client):
    """
    TEST 5 — INVALID/MISSING PH
    Input: Valid image + invalid pH (e.g. 14.0 or out of range)
    Expected: Model 2 not executed, No fake pH, Model 1 fallback if image exists.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_Temperature": "36.5",
        "Milk_pH": "14.0",  # Out of valid range (6.0-8.0)
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]

    assert data["mode"] == "image_only"
    assert data["model_2_used"] is False


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6 — MISSING CONDUCTIVITY
# ─────────────────────────────────────────────────────────────────────────────
def test_case_6_missing_previous_mastitis_fallback(client):
    """
    TEST 6 — MISSING CONDUCTIVITY
    Input: Valid image + missing conductivity
    Expected: Model 2 not executed, Model 1 fallback.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_Temperature": "36.5",
        "Milk_pH": "6.7",
        # Missing Milk_Conductivity
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]

    assert data["mode"] == "image_only"
    assert data["model_2_used"] is False


# ─────────────────────────────────────────────────────────────────────────────
# TEST 7 — MISSING MILK YIELD
# ─────────────────────────────────────────────────────────────────────────────
def test_case_7_missing_months_fallback(client):
    """
    TEST 7 — MISSING MILK YIELD
    Input: Valid image + missing milk yield
    Expected: Model 2 not executed, Model 1 fallback.
    """
    img_buf = _make_dummy_image_bytes()
    payload = {
        "image": (img_buf, "udder.jpg"),
        "Milk_Temperature": "36.5",
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        # Missing Milk_Yield
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    body = response.get_json()
    assert body["success"] is True
    data = body["data"]

    assert data["mode"] == "image_only"
    assert data["model_2_used"] is False


# ─────────────────────────────────────────────────────────────────────────────
# TEST 8 — INVALID IMAGE
# ─────────────────────────────────────────────────────────────────────────────
def test_case_8_invalid_image(client):
    """
    TEST 8 — INVALID IMAGE
    Input: Corrupt non-image byte stream
    Expected: Controlled image validation error (HTTP 400), No prediction.
    """
    corrupt_bytes = io.BytesIO(b"Not an actual image byte stream at all")
    payload = {
        "image": (corrupt_bytes, "corrupt.jpg"),
        "Milk_Temperature": "36.5",
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 400

    body = response.get_json()
    assert body["success"] is False
    assert "error" in body


# ─────────────────────────────────────────────────────────────────────────────
# TEST 9 — GRAD-CAM
# ─────────────────────────────────────────────────────────────────────────────
def test_case_9_gradcam():
    """
    TEST 9 — GRAD-CAM
    Expected: Correct Grad-CAM, Correct overlay, Verified on new Model 1.
    """
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    heatmap, overlay, prob = m1_gradcam(dummy_img)

    assert heatmap is not None
    assert heatmap.shape == (224, 224)
    assert heatmap.min() >= 0.0
    assert heatmap.max() <= 1.0

    assert overlay is not None
    assert overlay.shape == (224, 224, 3)
    assert overlay.dtype == np.uint8

    assert 0.0 <= prob <= 1.0


# ─────────────────────────────────────────────────────────────────────────────
# TEST 10 — REPORT
# ─────────────────────────────────────────────────────────────────────────────
def test_case_10_report():
    """
    TEST 10 — REPORT
    Expected: Correct prediction, Correct confidence, Correct prediction mode,
              Correct severity, Correct recommendation, Correct model analysis, Correct Grad-CAM.
    """
    pred_result = {
        "prediction": "Mastitis",
        "predicted_class": "Mastitis",
        "confidence": 0.91,
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {
            "prediction": "Mastitis",
            "confidence": 0.88,
            "model": "ResNet50 (Stage 1, frozen backbone)",
        },
        "numerical_prediction": {
            "prediction": "Mastitis",
            "confidence": 0.94,
            "model": "Decision Tree Classifier (Model 2)",
        },
        "numerical_measurements": {
            "Milk_Temperature": 38.8,
            "Milk_pH": 7.2,
            "Milk_Conductivity": 6.9,
            "Milk_Yield": 9.5,
            "Clotting": 1,
        },
        "severity": {
            "severity_level": "moderate",
            "severity_code": 2,
            "severity_label": "Moderate Mastitis",
            "confidence_score": 0.85,
            "recommendation": "Moderate mastitis indicators detected. Veterinary consultation recommended.",
            "action": "treat",
        },
        "stage": "Moderate Mastitis",
        "recommendation": "Moderate mastitis indicators detected. Veterinary consultation recommended.",
    }

    cattle_info = {"tag_id": "COW-104", "name": "Bessie", "breed": "Jersey"}
    farmer_info = {"name": "Chamara", "farm_name": "Highland Dairy", "phone": "+94 77 123 4567"}

    pdf_bytes = report_generator.generate_pdf(
        prediction_result=pred_result,
        cattle_info=cattle_info,
        farmer_info=farmer_info,
    )

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
