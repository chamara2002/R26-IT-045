"""
test_symptom_assessment.py
Automated test suite for farmer symptom checklist and probability adjustment fusion layer.
"""
import sys
from pathlib import Path
import io
import json
import pytest
import numpy as np
import cv2

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from utils.symptom_assessor import evaluate_symptoms, apply_symptom_fusion, SYMPTOM_WEIGHTS
from inference.prediction_pipeline import PredictionPipeline
from api.flask_api import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def _make_dummy_image():
    img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, enc = cv2.imencode(".jpg", img)
    return io.BytesIO(enc.tobytes())


def test_symptom_assessor_all_yes_score_is_one():
    """Verify that answering yes to all 6 symptoms yields a symptom_score of 1.0."""
    all_yes = {k: True for k in SYMPTOM_WEIGHTS}
    score, reported, has_answered = evaluate_symptoms(all_yes)

    assert score == 1.0
    assert has_answered is True
    assert len(reported) == 6
    assert sum(SYMPTOM_WEIGHTS.values()) == 1.0


def test_symptom_assessor_partial_symptoms_and_blending():
    """
    Verify calculation with partial symptoms:
    milk_has_clots=0.20 + udder_swollen=0.20 -> symptom_score=0.40
    With model_probability=0.62:
    final = 0.85*0.62 + 0.15*0.40 = 0.527 + 0.060 = 0.587
    """
    symptoms = {
        "milk_has_clots": True,
        "udder_swollen": "yes",
        "udder_feels_warm": False,
        "milk_color_changed": "no",
    }
    score, reported, has_answered = evaluate_symptoms(symptoms)
    assert score == 0.40
    assert has_answered is True
    assert "milk_has_clots" in reported
    assert "udder_swollen" in reported
    assert "udder_feels_warm" not in reported

    final_prob, assessment = apply_symptom_fusion(0.62, symptoms)
    assert final_prob == 0.587
    assert assessment["adjustment_applied"] is True
    assert assessment["symptom_score"] == 0.40
    assert assessment["probability_before_adjustment"] == 0.62
    assert assessment["probability_after_adjustment"] == 0.587


def test_symptom_assessor_no_symptoms_no_adjustment():
    """Verify that when no symptoms are answered, adjustment_applied is False and prob unchanged."""
    final_prob, assessment = apply_symptom_fusion(0.75, None)
    assert final_prob == 0.75
    assert assessment["adjustment_applied"] is False
    assert assessment["symptom_score"] is None
    assert assessment["probability_before_adjustment"] is None
    assert assessment["probability_after_adjustment"] is None

    # Empty dict
    final_prob2, assessment2 = apply_symptom_fusion(0.75, {})
    assert final_prob2 == 0.75
    assert assessment2["adjustment_applied"] is False


def test_pipeline_symptom_checklist_integration():
    """Verify PredictionPipeline integrates symptom adjustment into assisted predictions."""
    pipeline = PredictionPipeline()
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)

    # 1. Without symptoms
    res_base = pipeline.predict_assisted(dummy_img, symptoms=None)
    base_mastitis_prob = res_base["mastitis_probability"]
    assert res_base["symptom_assessment"]["adjustment_applied"] is False

    # 2. With all 6 symptoms
    all_yes = {k: True for k in SYMPTOM_WEIGHTS}
    res_symptoms = pipeline.predict_assisted(dummy_img, symptoms=all_yes)
    assert res_symptoms["symptom_assessment"]["adjustment_applied"] is True
    assert res_symptoms["symptom_assessment"]["symptom_score"] == 1.0
    expected_adjusted_prob = round(0.85 * base_mastitis_prob + 0.15 * 1.0, 4)
    assert res_symptoms["mastitis_probability"] == expected_adjusted_prob


def test_api_predict_assisted_with_symptoms(client):
    """Test POST /api/predict/assisted with symptoms form-data."""
    img_buf = _make_dummy_image()
    payload = {
        "image": (img_buf, "test.jpg"),
        "milk_has_clots": "true",
        "udder_swollen": "true",
        "milk_color_changed": "false",
    }

    res = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert res.status_code == 200

    data = res.get_json()
    assert data["success"] is True
    d = data["data"]
    assert "symptom_assessment" in d
    sym = d["symptom_assessment"]
    assert sym["adjustment_applied"] is True
    assert sym["symptom_score"] == 0.40
    assert "milk_has_clots" in sym["symptoms_reported"]
    assert "udder_swollen" in sym["symptoms_reported"]
    assert "symptom_checklist" in d["sources_used"]


def test_api_predict_assisted_without_symptoms_has_no_adjustment(client):
    """Test POST /api/predict/assisted without symptoms leaves adjustment_applied=False."""
    img_buf = _make_dummy_image()
    payload = {
        "image": (img_buf, "test.jpg"),
    }

    res = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert res.status_code == 200

    data = res.get_json()
    assert data["success"] is True
    d = data["data"]
    assert "symptom_assessment" in d
    assert d["symptom_assessment"]["adjustment_applied"] is False
    assert "symptom_checklist" not in d["sources_used"]


def test_multimodal_hybrid_with_symptoms_uses_fused_probability(client):
    """
    Test that when Image + Numerical + Symptoms are all three provided:
    1. Mode is 'multimodal_image_numerical' with model_2_used=True.
    2. probability_before_adjustment is the (M1 + M2)/2 soft-voting probability (NOT M1 alone).
    3. probability_after_adjustment correctly blends the fused probability with symptom_score.
    """
    pipeline = PredictionPipeline()
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    measurements = {
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }
    symptoms = {
        "milk_has_clots": True,  # 0.20
        "udder_swollen": True,    # 0.20
    }

    # Step A: Get raw M1 alone
    res_m1 = pipeline.predict_assisted(dummy_img, numerical_measurements=None, symptoms=None)
    m1_mastitis_prob = res_m1["image_prediction"]["mastitis_confidence"]

    # Step B: Get raw M2 alone
    res_m2 = pipeline.predict_numerical(measurements)
    m2_mastitis_prob = res_m2["mastitis_probability"]

    # Step C: Expected fused probability
    expected_fused_prob = float((m1_mastitis_prob + m2_mastitis_prob) / 2.0)

    # Step D: Run combined Image + Numerical + Symptoms
    res_hybrid = pipeline.predict_assisted(
        image_array=dummy_img,
        numerical_measurements=measurements,
        symptoms=symptoms
    )

    assert res_hybrid["mode"] == "multimodal_image_numerical"
    assert res_hybrid["model_2_used"] is True
    sym_assess = res_hybrid["symptom_assessment"]
    assert sym_assess["adjustment_applied"] is True
    assert sym_assess["symptom_score"] == 0.40
    # Confirm probability_before_adjustment is the fused probability, NOT m1 alone
    assert sym_assess["probability_before_adjustment"] == round(expected_fused_prob, 4)
    expected_final = round(0.85 * expected_fused_prob + 0.15 * 0.40, 4)
    assert sym_assess["probability_after_adjustment"] == expected_final


def test_symptom_assessor_ambiguous_value_ignored():
    """
    Verify that ambiguous/unrecognized strings (e.g. 'maybe', 'unknown', 'idk')
    are excluded from scoring and treated as not answered (adjustment_applied=False),
    rather than erroneously acting as an explicit False that biases probability downward.
    """
    ambiguous_symptoms = {
        "milk_has_clots": "maybe",
        "udder_swollen": "unknown",
        "udder_feels_warm": "idk",
    }
    score, reported, has_answered = evaluate_symptoms(ambiguous_symptoms)
    assert score == 0.0
    assert reported == {}
    assert has_answered is False

    # Apply fusion and verify probability is untouched
    final_prob, assessment = apply_symptom_fusion(0.60, ambiguous_symptoms)
    assert final_prob == 0.60
    assert assessment["adjustment_applied"] is False
    assert assessment["symptom_score"] is None

    # Compare against omitting the symptom entirely
    omitted_prob, omitted_assess = apply_symptom_fusion(0.60, None)
    assert final_prob == omitted_prob
    assert assessment == omitted_assess


def test_symptom_assessor_explicit_false_applies_adjustment_with_zero_score():
    """
    Verify that explicit negative responses (False, 'no', 0) ARE treated as answered
    with symptom_score=0.0 and adjustment_applied=True (0.85 * P + 0.15 * 0.0).
    """
    explicit_false = {
        "milk_has_clots": False,
        "udder_swollen": "no",
        "milk_color_changed": 0,
    }
    score, reported, has_answered = evaluate_symptoms(explicit_false)
    assert score == 0.0
    assert reported == {}
    assert has_answered is True

    final_prob, assessment = apply_symptom_fusion(0.60, explicit_false)
    assert final_prob == round(0.85 * 0.60 + 0.15 * 0.0, 4)  # 0.51
    assert assessment["adjustment_applied"] is True
    assert assessment["symptom_score"] == 0.0
