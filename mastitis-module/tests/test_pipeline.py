"""
Unit tests for PredictionPipeline, HybridFusionModel, and SeverityEngine.
Includes comprehensive tests for all 6 missing-input-aware cases.
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


def test_pipeline_case_1_all_six_values_available(pipeline):
    """Case 1: All 6 numerical values available -> Complete Model 2 used."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    measurements = [38.5, 7.2, 7.5, 800.0, 10.0, 1.0]

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=measurements)

    assert result is not None
    assert result["prediction"] in ["Mastitis", "Normal"]
    assert result["mode"] == "multimodal_image_numerical"
    assert result["model_2_used"] is True
    assert result["numerical_model_type"] == "complete"
    assert result["missing_numerical_features"] == []
    assert result["numerical_prediction"]["status"] == "ready"
    assert result["numerical_prediction"]["label"] in [0, 1]


def test_pipeline_case_2_one_missing_value(pipeline):
    """Case 2: Exactly 1 numerical value missing (e.g. Milk_pH) -> Missing-Aware Model 2 used."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    # Milk_pH is None
    measurements = [38.5, None, 7.5, 800.0, 10.0, 1.0]

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=measurements)

    assert result is not None
    assert result["prediction"] in ["Mastitis", "Normal"]
    assert result["mode"] == "multimodal_image_numerical"
    assert result["model_2_used"] is True
    assert result["numerical_model_type"] == "missing_aware"
    assert result["missing_numerical_features"] == ["Milk_pH"]
    assert result["numerical_prediction"]["status"] == "ready"
    assert result["numerical_prediction"]["label"] in [0, 1]


def test_pipeline_case_3_two_missing_values(pipeline):
    """Case 3: Exactly 2 numerical values missing (e.g. Milk_pH & SCC) -> Missing-Aware Model 2 used."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    # Milk_pH and Somatic_Cell_Count are None
    measurements = [38.5, None, 7.5, None, 10.0, 1.0]

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=measurements)

    assert result is not None
    assert result["prediction"] in ["Mastitis", "Normal"]
    assert result["mode"] == "multimodal_image_numerical"
    assert result["model_2_used"] is True
    assert result["numerical_model_type"] == "missing_aware"
    assert result["missing_numerical_features"] == ["Milk_pH", "Somatic_Cell_Count"]
    assert result["numerical_prediction"]["status"] == "ready"


def test_pipeline_case_4_three_missing_values_fallback(pipeline):
    """Case 4: Three or more values missing -> Model 2 unavailable, clean fallback to Model 1."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    # Milk_pH, Milk_Conductivity, Somatic_Cell_Count are None
    measurements = [38.5, None, None, None, 10.0, 1.0]

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=measurements)

    assert result is not None
    assert result["mode"] == "image_only"
    assert result["model_2_used"] is False
    assert result["numerical_model_type"] == "unavailable"
    assert len(result["missing_numerical_features"]) == 3
    assert result["numerical_prediction"]["status"] == "unavailable"
    assert "numerical_measurements" not in result["sources_used"]


def test_pipeline_case_5_all_missing_values(pipeline):
    """Case 5: All numerical values missing -> Model 2 unavailable, image-only prediction."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=None)

    assert result is not None
    assert result["mode"] == "image_only"
    assert result["model_2_used"] is False
    assert result["numerical_model_type"] == "unavailable"
    assert result["numerical_prediction"] is None
    assert result["image_prediction"]["status"] == "ready"


def test_pipeline_case_6_valid_zero_clotting(pipeline):
    """Case 6: Clotting = 0.0 is a valid numerical measurement, NOT missing."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    # All 6 features present, Clotting is 0.0 (No)
    measurements = [35.5, 6.7, 5.0, 150.0, 20.0, 0.0]

    result = pipeline.predict_assisted(dummy_img, numerical_measurements=measurements)

    assert result is not None
    assert result["model_2_used"] is True
    assert result["numerical_model_type"] == "complete"
    assert result["missing_numerical_features"] == []
    assert result["numerical_prediction"]["status"] == "ready"


def test_severity_engine_classifications():
    """Test severity engine classification for normal and diseased cases with partial data."""
    engine = MastitisSeverityEngine()

    # Normal case
    normal_res = engine.classify_severity(prediction_label=0, prediction_confidence=0.9, health_metrics={})
    assert normal_res["severity_level"] == "negative"
    assert normal_res["severity_code"] == 0
    assert normal_res["action"] == "none"

    # Mild mastitis case with partial metrics
    mild_res = engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.55,
        health_metrics={"somatic_cell_count": 250, "milk_yield": None}
    )
    assert mild_res["severity_level"] in ["mild", "moderate"]

    # Severe mastitis case
    severe_res = engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.95,
        health_metrics={"somatic_cell_count": 950, "body_temperature": 40.2, "milk_yield": 6.0}
    )
    assert severe_res["severity_level"] == "severe"
    assert severe_res["action"] == "urgent"
