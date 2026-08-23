"""
Integration tests for Flask REST API endpoints.
"""
import sys
from pathlib import Path
import io
import pytest
import numpy as np
import cv2

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from api.flask_api import app


@pytest.fixture
def client():
    """Fixture providing Flask test client."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    """Test GET /api/health returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert data["data"]["models_ready"]["model_2_pipeline"] is True


def test_info_endpoint(client):
    """Test GET /api/info returns API schema and 5 required feature names."""
    response = client.get("/api/info")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert "ResNet" in data["data"]["image_model"]
    assert len(data["data"]["features_required"]) == 5
    assert "Milk_Temperature" in data["data"]["features_required"]
    assert "Milk_pH" in data["data"]["features_required"]
    assert "Milk_Conductivity" in data["data"]["features_required"]
    assert "Milk_Yield" in data["data"]["features_required"]
    assert "Clotting" in data["data"]["features_required"]


def test_predict_numerical_direct_success(client):
    """Test POST /predict with all 5 required features returns 200 with probabilities."""
    payload = {
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["disease"] == "mastitis"
    assert data["data"]["predicted_class"] in ("Normal", "Mastitis")
    assert "normal_probability" in data["data"]
    assert "mastitis_probability" in data["data"]
    assert 0.0 <= data["data"]["normal_probability"] <= 1.0
    assert 0.0 <= data["data"]["mastitis_probability"] <= 1.0


def test_predict_numerical_direct_missing_field_rejected(client):
    """Test POST /predict with missing field returns 400 Bad Request."""
    payload = {
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        # Milk_Conductivity is missing
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required model features" in data["error"] or "Validation failed" in data["message"]


def test_predict_assisted_endpoint_with_image_and_numerical(client):
    """Test POST /api/predict/assisted with udder image and all 5 numerical measurements (Hybrid Fusion)."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test_udder.jpg"),
        "Milk_Temperature": "36.5",
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert "prediction" in data["data"]
    assert "confidence" in data["data"]
    assert "predicted_class" in data["data"]
    assert "normal_probability" in data["data"]
    assert "mastitis_probability" in data["data"]
    assert data["data"]["model_2_used"] is True
    assert data["data"]["mode"] == "multimodal_image_numerical"
    assert data["data"]["numerical_prediction"] is not None
    assert data["data"]["image_prediction"] is not None
    assert data["data"]["numerical_measurements"] is not None


def test_predict_assisted_image_only(client):
    """Test POST /api/predict/assisted with only udder image (Model 1 Image-Only Mode)."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test_udder.jpg"),
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert "prediction" in data["data"]
    assert "confidence" in data["data"]
    assert data["data"]["model_2_used"] is False
    assert data["data"]["mode"] == "image_only"
    assert data["data"]["numerical_analysis_available"] is False
    assert data["data"]["numerical_prediction"] is None
    assert data["data"]["numerical_measurements"] is None
    assert data["data"]["image_prediction"] is not None


def test_predict_assisted_missing_numerical_feature_fallback(client):
    """Test POST /api/predict/assisted with image and partial numerical features cleanly falls back to Model 1."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test_udder.jpg"),
        "Milk_Temperature": "36.5",
        # Milk_pH, conductivity, yield, clotting missing
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert "prediction" in data["data"]
    assert "confidence" in data["data"]
    assert data["data"]["model_2_used"] is False
    assert data["data"]["mode"] == "image_only"
    assert data["data"]["numerical_analysis_available"] is False
    assert data["data"]["numerical_prediction"] is None


def test_predict_assisted_no_image_rejected(client):
    """Test POST /api/predict/assisted with no image returns 400 Bad Request."""
    payload = {
        "Milk_Temperature": "36.5",
        "Milk_pH": "6.7",
        "Milk_Conductivity": "4.8",
        "Milk_Yield": "18.0",
        "Clotting": "0",
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "No image provided" in data["error"] or "required" in data["message"]


def test_413_payload_too_large_returns_json(client):
    """Test that payloads exceeding MAX_CONTENT_LENGTH (10MB) return standard 413 JSON."""
    large_payload = b"0" * (12 * 1024 * 1024)  # 12MB
    response = client.post(
        "/api/predict/assisted",
        data={"image": (io.BytesIO(large_payload), "oversized.jpg")},
        content_type="multipart/form-data"
    )
    assert response.status_code == 413
    assert response.is_json is True
    data = response.get_json()
    assert data["success"] is False
    assert "10MB" in data["message"]
    assert "Payload too large" in data["error"]


def test_assisted_invalid_biomarker_returns_validation_warnings(client):
    """Test that invalid biomarkers in assisted prediction return descriptive validation_warnings."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test.jpg"),
        "Milk_Temperature": "38.5",
        "Milk_pH": "-5.0",  # Invalid pH out of range [6.0, 8.0]
        "Milk_Conductivity": "6.5",
        "Milk_Yield": "15.0",
        "Clotting": "0",
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["mode"] == "image_only"
    assert data["data"]["model_2_used"] is False
    assert data["data"]["validation_warnings"] is not None
    assert any("Milk_pH" in w for w in data["data"]["validation_warnings"])


def test_assisted_omitted_biomarker_has_null_validation_warnings(client):
    """Test that legitimately omitted biomarkers do not produce false positive validation warnings."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test.jpg"),
    }
    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["mode"] == "image_only"
    assert data["data"]["validation_warnings"] is None
