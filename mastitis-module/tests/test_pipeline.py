"""
Unit tests for PredictionPipeline, HybridFusionModel, and SeverityEngine.
Tests the 4-feature sklearn pipeline model integration.
"""
import sys
from pathlib import Path
import pytest
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from inference.prediction_pipeline import PredictionPipeline
from utils.severity_engine import MastitisSeverityEngine


@pytest.fixture(scope="module")
def pipeline():
    """Fixture providing initialized PredictionPipeline."""
    return PredictionPipeline()


def test_pipeline_numerical_prediction(pipeline):
    """Test numerical prediction using the 5 required features."""
    measurements = {
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }

    result = pipeline.predict_numerical(measurements)

    assert result is not None
    assert result["predicted_class"] in ["Mastitis", "Normal"]
    assert "normal_probability" in result
    assert "mastitis_probability" in result
    assert 0.0 <= result["normal_probability"] <= 1.0
    assert 0.0 <= result["mastitis_probability"] <= 1.0


def test_pipeline_assisted_multimodal(pipeline):
    """Test assisted multimodal prediction (image + 5 numerical features)."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    measurements = {
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=measurements)

    assert result is not None
    assert result["prediction"] in ["Mastitis", "Normal"]
    assert result["model_2_used"] is True
    assert result["numerical_prediction"]["status"] == "ready"


def test_pipeline_image_only(pipeline):
    """Test image-only assisted prediction."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=None)

    assert result is not None
    assert result["mode"] == "image_only"
    assert result["model_2_used"] is False


def test_severity_engine_classifications():
    """Test severity engine classification for normal and diseased cases."""
    engine = MastitisSeverityEngine()

    # Normal case
    normal_res = engine.classify_severity(prediction_label=0, prediction_confidence=0.9, health_metrics={"temperature": 38.5})
    assert normal_res["severity_level"] == "negative"
    assert normal_res["severity_code"] == 0
    assert normal_res["action"] == "none"

    # Mild mastitis case
    mild_res = engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.55,
        health_metrics={"temperature": 38.6}
    )
    assert mild_res["severity_level"] in ["mild", "moderate"]

    # Severe mastitis case with high fever
    severe_res = engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.95,
        health_metrics={"temperature": 40.5}
    )
    assert severe_res["severity_level"] == "severe"
    assert severe_res["action"] == "urgent"
