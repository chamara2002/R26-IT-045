"""
Automated unit and integration tests for Severity-Based Farmer Guidance and Report Rules.
Validates:
1. Normal / No Mastitis -> Routine prevention protocols (clean bedding, dry teats, dipping).
2. Mild Mastitis -> Close monitoring, hygiene escalation, antimicrobial safety warning.
3. Moderate Mastitis -> Veterinary consultation recommendation, escalation signs, milk segregation.
4. Severe / Critical Mastitis -> Urgent veterinary intervention warning, complete handover document.
5. Veterinary PDF report generation executes properly for severe / critical cases.
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
        health_metrics={"temperature": 38.4}
    )

    assert result["severity_level"] == "negative"
    assert result["severity_code"] == 0
    assert "routine" in result["recommendation"].lower() or "no mastitis" in result["recommendation"].lower()

    protocol = severity_engine.get_treatment_protocol("negative")
    assert protocol["action"] == "Routine Prevention"
    assert any("bedding" in m.lower() for m in protocol["measures"])
    assert any("disinfectant" in m.lower() or "dip" in m.lower() for m in protocol["measures"])


def test_mild_severity_guidance(severity_engine):
    """Test Mild case produces monitoring guidance and antimicrobial stewardship warning."""
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.50,
        health_metrics={"temperature": 38.6}
    )

    assert result["severity_level"] == "mild"
    assert result["severity_code"] == 1
    assert "antibiotics" in result["recommendation"].lower()

    protocol = severity_engine.get_treatment_protocol("mild")
    assert "monitoring" in protocol["action"].lower() or "hygiene" in protocol["action"].lower()
    assert any("antibiotics" in m.lower() for m in protocol["measures"])


def test_moderate_severity_guidance(severity_engine):
    """Test Moderate case produces veterinary consultation recommendation and segregation advice."""
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.75,
        health_metrics={"temperature": 39.4}
    )

    assert result["severity_level"] in ("moderate", "severe")

    protocol = severity_engine.get_treatment_protocol("moderate")
    assert "veterinary" in protocol["action"].lower()
    assert any("segregate" in m.lower() or "veterinarian" in m.lower() for m in protocol["measures"])


def test_severe_critical_severity_guidance(severity_engine):
    """Test Severe case produces urgent veterinary alert and critical handover instructions."""
    result = severity_engine.classify_severity(
        prediction_label=1,
        prediction_confidence=0.96,
        health_metrics={"temperature": 40.5}
    )

    assert result["severity_level"] == "severe"
    assert result["severity_code"] == 3
    assert "critical" in result["recommendation"].lower() or "immediate" in result["recommendation"].lower()

    protocol = severity_engine.get_treatment_protocol("severe")
    assert "urgent" in protocol["action"].lower() or "emergency" in protocol["action"].lower()
    assert any("veterinarian" in m.lower() for m in protocol["measures"])


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
