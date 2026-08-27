"""
Automated unit and integration tests for Severity-Based Farmer Guidance and Report Rules.
Validates:
1. Normal / No Mastitis -> Routine prevention protocols (clean bedding, dry teats, dipping).
2. Path A -> Multi-biomarker weighted scoring (conductivity 40%, symptoms 35%, temperature 25%).
3. Path B -> Farmer symptom checklist scoring (symptoms 100%).
4. Insufficient Data Guard -> Prevents fabricated severity when farmer provides no symptoms on Path B.
5. Inversion Fix Verification -> Model prediction confidence does not distort severity staging.
6. Veterinary PDF report generation executes properly for severe / critical cases.
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

from utils.severity_engine import MastitisSeverityEngine
from utils.report_generator import VeterinaryReportGenerator
from api.flask_api import app


@pytest.fixture(scope="module")
def severity_engine():
    return MastitisSeverityEngine()


@pytest.fixture(scope="module")
def report_generator():
    return VeterinaryReportGenerator()


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_normal_severity_guidance(severity_engine):
    """Test Normal case produces routine prevention protocol without alarming medication directives."""
    result = severity_engine.classify_severity(
        prediction_label=0,
        prediction_confidence=0.92,
        health_metrics={"temperature": 38.4, "conductivity": 4.8},
        model_2_used=True
    )

    assert result["severity_level"] == "negative"
    assert result["severity_code"] == 0
    assert "routine" in result["recommendation"].lower() or "no mastitis" in result["recommendation"].lower()

    protocol = severity_engine.get_treatment_protocol("negative")
    assert protocol["action"] == "Routine Prevention"
    assert any("bedding" in m.lower() for m in protocol["measures"])
    assert any("disinfectant" in m.lower() or "dip" in m.lower() for m in protocol["measures"])


def test_path_a_severe_biomarkers(severity_engine):
    """Test Path A with clear severe biomarkers (elevated conductivity + fever + severe symptoms)."""
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.55,  # Low confidence should NOT prevent severe clinical classification
        health_metrics={"temperature": 40.5, "conductivity": 9.5},
        symptoms_dict={"udder_swollen": True, "milk_has_clots": True, "udder_feels_warm": True},
        model_2_used=True
    )

    assert result["severity_level"] == "severe"
    assert result["severity_code"] == 3
    assert result["path_used"] == "path_a"
    assert result["action"] == "urgent"
    assert "critical" in result["recommendation"].lower() or "immediate" in result["recommendation"].lower()

    protocol = severity_engine.get_treatment_protocol("severe")
    assert "urgent" in protocol["action"].lower() or "emergency" in protocol["action"].lower()
    assert any("veterinarian" in m.lower() for m in protocol["measures"])


def test_path_a_mild_biomarkers(severity_engine):
    """Test Path A with clear mild biomarkers (normal conductivity + normal temperature)."""
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.99,  # High confidence should NOT inflate mild clinical biomarkers
        health_metrics={"temperature": 38.4, "conductivity": 4.8},
        symptoms_dict=None,
        model_2_used=True
    )

    assert result["severity_level"] == "mild"
    assert result["severity_code"] == 1
    assert result["path_used"] == "path_a"
    assert result["action"] == "monitor"
    assert "antibiotics" in result["recommendation"].lower()


def test_path_b_severe_symptoms(severity_engine):
    """Test Path B (no Model 2 biomarkers) with 5-6 symptoms marked YES."""
    symptoms = {
        "udder_swollen": True,
        "milk_has_clots": True,
        "udder_feels_warm": True,
        "milk_color_changed": True,
        "milk_yield_dropped": True,
    }
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.60,
        symptoms_dict=symptoms,
        model_2_used=False
    )

    assert result["severity_level"] == "severe"
    assert result["severity_code"] == 3
    assert result["path_used"] == "path_b"
    assert result["severity_score"] >= 0.80


def test_path_b_moderate_symptoms(severity_engine):
    """Test Path B with 3-4 symptoms marked YES."""
    symptoms = {
        "milk_has_clots": True,
        "udder_swollen": True,
        "udder_feels_warm": True,
    }
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.70,
        symptoms_dict=symptoms,
        model_2_used=False
    )

    assert result["severity_level"] == "moderate"
    assert result["severity_code"] == 2
    assert result["path_used"] == "path_b"
    assert 0.50 <= result["severity_score"] < 0.80


def test_path_b_mild_symptoms(severity_engine):
    """Test Path B with 1-2 symptoms marked YES."""
    symptoms = {
        "milk_color_changed": True,
    }
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.95,
        symptoms_dict=symptoms,
        model_2_used=False
    )

    assert result["severity_level"] == "mild"
    assert result["severity_code"] == 1
    assert result["path_used"] == "path_b"
    assert result["severity_score"] < 0.50


def test_path_b_zero_symptoms_answered_insufficient_data(severity_engine):
    """Test Path B with zero symptoms answered returns insufficient_data instead of fabricated Mild tier."""
    # Case 1: None
    result_none = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.90,
        symptoms_dict=None,
        model_2_used=False
    )
    assert result_none["severity_level"] == "insufficient_data"
    assert result_none["severity_code"] is None
    assert result_none["severity_score"] is None
    assert "Insufficient clinical detail" in result_none["recommendation"]
    assert result_none["action"] == "gather_data"

    # Case 2: Empty dict
    result_empty = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.90,
        symptoms_dict={},
        model_2_used=False
    )
    assert result_empty["severity_level"] == "insufficient_data"


def test_severity_confidence_inversion_resolved(severity_engine):
    """
    Verify fix for clinical inversion bug:
    1. High model confidence + 1 mild symptom must score Mild (not inflated to Moderate/Severe).
    2. Low model confidence + 5 severe symptoms must score Severe (not suppressed to Mild).
    """
    # Case 1: High confidence (0.99) + 1 mild symptom (0.15)
    mild_case = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.99,
        symptoms_dict={"milk_color_changed": True},
        model_2_used=False
    )
    assert mild_case["severity_level"] == "mild"
    assert mild_case["severity_score"] == 0.15

    # Case 2: Low confidence (0.52) + 5 severe symptoms (0.85)
    severe_case = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.52,
        symptoms_dict={
            "udder_swollen": True,
            "milk_has_clots": True,
            "udder_feels_warm": True,
            "milk_color_changed": True,
            "milk_yield_dropped": True,
        },
        model_2_used=False
    )
    assert severe_case["severity_level"] == "severe"
    assert severe_case["severity_score"] == 0.85


def test_conductivity_scoring_bands(severity_engine):
    """Test conductivity scoring bands."""
    assert severity_engine.conductivity_score(4.5) == 0.0
    assert severity_engine.conductivity_score(5.5) == 0.0
    assert severity_engine.conductivity_score(6.0) == 0.35
    assert severity_engine.conductivity_score(7.0) == 0.35
    assert severity_engine.conductivity_score(8.0) == 0.70
    assert severity_engine.conductivity_score(9.0) == 0.70
    assert severity_engine.conductivity_score(9.5) == 1.0
    assert severity_engine.conductivity_score(None) == 0.0
    assert severity_engine.conductivity_score("invalid") == 0.0


def test_temperature_scoring_bands(severity_engine):
    """Test temperature scoring bands."""
    assert severity_engine.temperature_score(38.0) == 0.0
    assert severity_engine.temperature_score(38.4) == 0.0
    assert severity_engine.temperature_score(38.5) == 0.35
    assert severity_engine.temperature_score(39.0) == 0.35
    assert severity_engine.temperature_score(39.2) == 0.70
    assert severity_engine.temperature_score(39.6) == 0.70
    assert severity_engine.temperature_score(40.0) == 1.0
    assert severity_engine.temperature_score(41.0) == 1.0
    assert severity_engine.temperature_score(None) == 0.0
    assert severity_engine.temperature_score("invalid") == 0.0


def test_veterinary_pdf_generation_for_critical_case(report_generator, tmp_path):
    """Test that Veterinary PDF generation succeeds for critical / severe cases with 4-panel visual evidence."""
    orig_file = tmp_path / "crit_orig.png"
    crop_file = tmp_path / "crit_crop.png"
    heat_file = tmp_path / "crit_heat.png"
    over_file = tmp_path / "crit_over.png"

    dummy_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
    cv2.imwrite(str(orig_file), dummy_img)
    cv2.imwrite(str(crop_file), dummy_img)
    cv2.imwrite(str(heat_file), dummy_img)
    cv2.imwrite(str(over_file), dummy_img)

    critical_payload = {
        "prediction": "Mastitis",
        "confidence": 0.94,
        "stage": "Severe Mastitis (Critical)",
        "roi_applied": True,
        "image_source": "farmer_selected_roi",
        "image_prediction": {"prediction": "Mastitis", "confidence": 0.95},
        "numerical_prediction": {"prediction": "Mastitis", "confidence": 0.91},
        "numerical_measurements": {
            "Milk_Temperature": 39.2,
            "Milk_pH": 7.3,
            "Milk_Conductivity": 7.5,
            "Milk_Yield": 6.0,
            "Clotting": 1,
        },
        "clinical_observations": {
            "milk_appearance": "Serum with flakes",
            "udder_swelling": "Severe",
            "udder_warmth": "Hot",
            "udder_pain": "Severe Pain",
            "body_temperature": "Fever (>39.5)",
            "appetite": "Reduced",
        },
        "severity": {
            "severity_level": "severe",
            "severity_label": "Severe Mastitis",
            "recommendation": "CRITICAL VETERINARY ATTENTION REQUIRED. Contact a licensed veterinarian immediately.",
        },
    }

    pdf_bytes = report_generator.generate_pdf(
        prediction_result=critical_payload,
        cattle_info={"name": "Daisy", "tag_id": "COW-999", "breed": "Jersey", "lactation_number": 3},
        farmer_info={"name": "David Miller", "farm_name": "Highland Dairy", "district": "Nuwara Eliya", "phone": "+94712345678"},
        original_image_path=str(orig_file),
        cropped_image_path=str(crop_file),
        heatmap_image_path=str(heat_file),
        overlay_image_path=str(over_file),
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")

