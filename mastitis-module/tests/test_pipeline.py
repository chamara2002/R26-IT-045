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
    assert result["mode"] == "multimodal_image_numerical"
    assert result["numerical_prediction"] is not None
    assert result["numerical_prediction"]["status"] == "ready"
    assert result["image_prediction"] is not None
    assert "numerical_measurements" in result["sources_used"]
    assert "udder_image" in result["sources_used"]


def test_pipeline_image_only(pipeline):
    """Test image-only assisted prediction."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=None)

    assert result is not None
    assert result["mode"] == "image_only"
    assert result["model_2_used"] is False
    assert result["numerical_prediction"] is None
    assert result["image_prediction"] is not None
    assert result["sources_used"] == ["udder_image"]


def test_severity_engine_classifications():
    """Test severity engine classification for normal and diseased cases across Path A and Path B."""
    engine = MastitisSeverityEngine()

    # Normal case
    normal_res = engine.classify_severity(
        prediction_label=0,
        prediction_confidence=0.9,
        health_metrics={"temperature": 38.5, "conductivity": 4.8},
        model_2_used=True
    )
    assert normal_res["severity_level"] == "negative"
    assert normal_res["severity_code"] == 0
    assert normal_res["action"] == "none"

    # Mild mastitis case (Path A: normal conductivity, mild temp, no symptoms)
    mild_res = engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.99,
        health_metrics={"temperature": 38.6, "conductivity": 5.0},
        model_2_used=True
    )
    assert mild_res["severity_level"] == "mild"
    assert mild_res["action"] == "monitor"

    # Severe mastitis case with high fever, high conductivity, and severe symptoms (Path A)
    severe_res = engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.55,
        health_metrics={"temperature": 40.5, "conductivity": 9.5},
        symptoms_dict={"udder_swollen": True, "milk_has_clots": True, "udder_feels_warm": True},
        model_2_used=True
    )
    assert severe_res["severity_level"] == "severe"
    assert severe_res["action"] == "urgent"
