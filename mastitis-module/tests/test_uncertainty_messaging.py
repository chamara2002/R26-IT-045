"""
Automated tests for Uncertainty-Aware Messaging and Borderline Prediction Detection.
Validates:
1. Image-only prediction just below threshold (0.24 vs 0.25) -> is_borderline=True, Normal.
2. Image-only prediction just above threshold (0.26 vs 0.25) -> is_borderline=True, Mastitis.
3. High-confidence predictions (0.05, 0.95) -> is_borderline=False, high_confidence.
4. Multimodal / numerical predictions near 0.50 -> is_borderline=True, active_threshold=0.50.
5. Flask API endpoint contract guarantees uncertainty fields in JSON response.
"""
import sys
from pathlib import Path
import pytest
import numpy as np
from unittest.mock import MagicMock

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config.config import get_config
from inference.hybrid_fusion import HybridFusionModel
from api.flask_api import app


@pytest.fixture
def mock_fusion_model():
    """Create a HybridFusionModel with controlled mock CNN outputs."""
    model = HybridFusionModel()
    model.cnn_model = MagicMock()
    model.model_1_threshold = 0.25
    model.borderline_delta = 0.15
    return model


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_image_only_just_below_threshold(mock_fusion_model):
    """
    Test prediction with probability 0.24 (just below 0.25 threshold):
    - Should be classified as Normal (label 0).
    - Should be marked is_borderline=True and uncertainty_level='borderline_uncertain'.
    - Should include uncertainty_note.
    """
    # Mock CNN returning prob_mastitis = 0.24
    mock_fusion_model.cnn_model.predict.return_value = np.array([[0.24]], dtype=np.float32)
    fake_img = np.zeros((224, 224, 3), dtype=np.float32)

    res = mock_fusion_model.predict_assisted(image_array=fake_img)

    assert res["overall_label"] == 0
    assert res["prediction"] == "Normal"
    assert res["is_borderline"] is True
    assert res["uncertainty_level"] == "borderline_uncertain"
    assert res["active_threshold"] == 0.25
    assert abs(res["threshold_distance"] - 0.01) < 1e-4
    assert res["uncertainty_note"] is not None
    assert "close to the decision boundary" in res["uncertainty_note"]


def test_image_only_just_above_threshold(mock_fusion_model):
    """
    Test prediction with probability 0.26 (just above 0.25 threshold):
    - Should be classified as Mastitis (label 1).
    - Should be marked is_borderline=True and uncertainty_level='borderline_uncertain'.
    - Should include uncertainty_note.
    """
    # Mock CNN returning prob_mastitis = 0.26
    mock_fusion_model.cnn_model.predict.return_value = np.array([[0.26]], dtype=np.float32)
    fake_img = np.zeros((224, 224, 3), dtype=np.float32)

    res = mock_fusion_model.predict_assisted(image_array=fake_img)

    assert res["overall_label"] == 1
    assert res["prediction"] == "Mastitis"
    assert res["is_borderline"] is True
    assert res["uncertainty_level"] == "borderline_uncertain"
    assert res["active_threshold"] == 0.25
    assert abs(res["threshold_distance"] - 0.01) < 1e-4
    assert res["uncertainty_note"] is not None


def test_high_confidence_predictions(mock_fusion_model):
    """
    Test high-confidence predictions far from the 0.25 threshold:
    - P=0.05 (distance 0.20 > delta 0.15) -> is_borderline=False
    - P=0.95 (distance 0.70 > delta 0.15) -> is_borderline=False
    """
    fake_img = np.zeros((224, 224, 3), dtype=np.float32)

    # 1. Very healthy case (P=0.05)
    mock_fusion_model.cnn_model.predict.return_value = np.array([[0.05]], dtype=np.float32)
    res_healthy = mock_fusion_model.predict_assisted(image_array=fake_img)
    assert res_healthy["prediction"] == "Normal"
    assert res_healthy["is_borderline"] is False
    assert res_healthy["uncertainty_level"] == "high_confidence"
    assert res_healthy["uncertainty_note"] is None

    # 2. Very clear mastitis case (P=0.95)
    mock_fusion_model.cnn_model.predict.return_value = np.array([[0.95]], dtype=np.float32)
    res_mastitis = mock_fusion_model.predict_assisted(image_array=fake_img)
    assert res_mastitis["prediction"] == "Mastitis"
    assert res_mastitis["is_borderline"] is False
    assert res_mastitis["uncertainty_level"] == "high_confidence"
    assert res_mastitis["uncertainty_note"] is None


def test_multimodal_borderline_zone(mock_fusion_model):
    """
    Test multimodal fusion mode where active_threshold is 0.50:
    - Fused probability 0.48 -> within delta 0.15 of 0.50 -> is_borderline=True
    - Fused probability 0.85 -> distance 0.35 > 0.15 -> is_borderline=False
    """
    # 1. Borderline multimodal case
    mock_fusion_model.cnn_model.predict.return_value = np.array([[0.46]], dtype=np.float32)
    fake_img = np.zeros((224, 224, 3), dtype=np.float32)
    mock_fusion_model.predict_numerical = MagicMock(return_value={
        "predicted_class": "Normal",
        "label": 0,
        "confidence": 0.50,
        "normal_probability": 0.50,
        "mastitis_probability": 0.50,
        "probabilities": [0.50, 0.50],
    })

    res = mock_fusion_model.predict_assisted(
        image_array=fake_img,
        numerical_measurements={"Milk_Temperature": 36.5, "Milk_pH": 6.7, "Milk_Conductivity": 5.0, "Milk_Yield": 15.0, "Clotting": 0}
    )

    # Fused mastitis prob = (0.46 + 0.50) / 2.0 = 0.48
    assert res["active_threshold"] == 0.50
    assert abs(res["mastitis_probability"] - 0.48) < 1e-4
    assert res["is_borderline"] is True
    assert res["uncertainty_level"] == "borderline_uncertain"


def test_flask_api_numerical_endpoint_uncertainty_contract(client):
    """Test that /predict (Model 2 numerical) includes uncertainty fields in response."""
    payload = {
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 200
    json_data = resp.get_json()
    assert json_data["success"] is True
    data = json_data["data"]

    assert "is_borderline" in data
    assert isinstance(data["is_borderline"], bool)
    assert "uncertainty_level" in data
    assert data["uncertainty_level"] in ("high_confidence", "borderline_uncertain")
    assert "active_threshold" in data
    assert "threshold_distance" in data
