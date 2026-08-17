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
    """Test GET /api/health returns 200, healthy status, and all models ready."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert data["data"]["models_ready"]["model_1_cnn"] is True
    assert data["data"]["models_ready"]["model_2_mlp"] is True
    assert data["data"]["models_ready"]["model_2_missing_aware"] is True


def test_info_endpoint(client):
    """Test GET /api/info returns API schema and 6 numerical feature names."""
    response = client.get("/api/info")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert len(data["data"]["numerical_features"]) == 6
    assert "Milk_Temperature" in data["data"]["numerical_features"]


def test_predict_assisted_endpoint_with_complete_numerical(client):
    """Test POST /api/predict/assisted with complete 6/6 numerical measurements."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test_udder.jpg"),
        "milk_temperature": "38.6",
        "milk_ph": "6.8",
        "milk_conductivity": "5.2",
        "somatic_cell_count": "280",
        "milk_yield": "19.5",
        "clotting": "No",
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert "prediction" in data["data"]
    assert "confidence" in data["data"]
    assert "severity" in data["data"]
    assert "heatmap_id" in data["data"]
    assert data["data"]["model_2_used"] is True
    assert data["data"]["numerical_model_type"] == "complete"
    assert data["data"]["numerical_prediction"]["status"] == "ready"


def test_predict_assisted_endpoint_with_one_missing_value(client):
    """Test POST /api/predict/assisted with 1 missing measurement (Milk_pH omitted)."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test_udder.jpg"),
        "milk_temperature": "38.6",
        # milk_ph omitted
        "milk_conductivity": "5.2",
        "somatic_cell_count": "280",
        "milk_yield": "19.5",
        "clotting": "No",
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["model_2_used"] is True
    assert data["data"]["numerical_model_type"] == "missing_aware"
    assert data["data"]["missing_numerical_features"] == ["Milk_pH"]
    assert data["data"]["numerical_prediction"]["status"] == "ready"


def test_predict_assisted_endpoint_with_three_missing_values_fallback(client):
    """Test POST /api/predict/assisted with 3 missing measurements -> Model 2 unavailable fallback."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "test_udder.jpg"),
        "milk_temperature": "38.6",
        "milk_yield": "19.5",
        "clotting": "No",
        # milk_ph, milk_conductivity, somatic_cell_count omitted
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["model_2_used"] is False
    assert data["data"]["numerical_model_type"] == "unavailable"
    assert len(data["data"]["missing_numerical_features"]) == 3


def test_predict_assisted_missing_image_returns_400(client):
    """Test POST /api/predict/assisted without image returns 400."""
    response = client.post("/api/predict/assisted", data={}, content_type="multipart/form-data")
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
