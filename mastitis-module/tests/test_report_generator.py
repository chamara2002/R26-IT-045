"""
Unit and integration tests for VeterinaryReportGenerator and report PDF endpoint.
"""
import sys
from pathlib import Path
import io
import pytest
import numpy as np
import cv2

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from utils.report_generator import VeterinaryReportGenerator
from api.flask_api import app


@pytest.fixture(scope="module")
def generator():
    """Fixture providing initialized VeterinaryReportGenerator."""
    return VeterinaryReportGenerator()


@pytest.fixture
def client():
    """Fixture providing Flask test client."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_report_generation_case_1_complete_measurements(generator):
    """Test PDF generation for Case 1 (6/6 complete numerical measurements)."""
    prediction_result = {
        "prediction": "Normal",
        "confidence": 0.92,
        "stage": "No Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "numerical_model_type": "complete",
        "missing_numerical_features": [],
        "image_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.94},
        "numerical_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.90, "model": "MLP Numerical Network (Model 2)"},
        "numerical_measurements": {"milk_temperature": 36.5, "milk_ph": 6.68, "milk_conductivity": 4.8, "somatic_cell_count": 140, "milk_yield": 21.0, "clotting": "No"},
        "clinical_observations": {"milk_yield_change": "Normal", "milk_appearance": "Normal", "udder_swelling": "No", "udder_warmth": "No", "udder_pain": "No", "body_temperature": "38.5°C", "appetite": "Normal"},
        "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
    }
    cattle_info = {"tag_id": "COW-101", "name": "Bella", "breed": "Holstein", "age": 4}
    farmer_info = {"name": "John Doe", "farm_name": "Sunrise Dairy"}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, farmer_info, report_id="RPT-TEST-001")
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_case_2_one_missing_value(generator):
    """Test PDF generation for Case 2 (5/6 measurements, Milk_pH missing)."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.84,
        "stage": "Moderate Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "numerical_model_type": "missing_aware",
        "missing_numerical_features": ["Milk_pH"],
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.81},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.87, "model": "MLP Missing-Aware Network (Model 2)"},
        "numerical_measurements": {"milk_temperature": 38.6, "milk_ph": None, "milk_conductivity": 6.9, "somatic_cell_count": 520, "milk_yield": 15.0, "clotting": "No"},
        "clinical_observations": {"milk_yield_change": "Mild drop", "milk_appearance": "Slightly watery", "udder_swelling": "Mild", "udder_warmth": "Yes", "udder_pain": "Mild", "body_temperature": "38.9°C", "appetite": "Normal"},
        "severity": {"severity_level": "moderate", "severity_code": 2, "severity_label": "Moderate Mastitis"},
    }

    pdf_bytes = generator.generate_pdf(prediction_result, report_id="RPT-TEST-002")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_case_3_two_missing_values(generator):
    """Test PDF generation for Case 3 (4/6 measurements, Milk_pH & SCC missing)."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.79,
        "stage": "Mild Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "numerical_model_type": "missing_aware",
        "missing_numerical_features": ["Milk_pH", "Somatic_Cell_Count"],
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.76},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.82, "model": "MLP Missing-Aware Network (Model 2)"},
        "numerical_measurements": {"milk_temperature": 38.4, "milk_ph": None, "milk_conductivity": 6.5, "somatic_cell_count": None, "milk_yield": 16.0, "clotting": "No"},
        "severity": {"severity_level": "mild", "severity_code": 1, "severity_label": "Mild Mastitis"},
    }

    pdf_bytes = generator.generate_pdf(prediction_result, report_id="RPT-TEST-003")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_case_4_three_missing_values_fallback(generator):
    """Test PDF generation for Case 4 (3/6 measurements -> Image-only fallback)."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.72,
        "stage": "Mild Mastitis",
        "mode": "image_only",
        "model_2_used": False,
        "numerical_model_type": "unavailable",
        "missing_numerical_features": ["Milk_pH", "Milk_Conductivity", "Somatic_Cell_Count"],
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.72},
        "numerical_prediction": None,
        "numerical_measurements": {"milk_temperature": 38.2, "milk_yield": 17.0, "clotting": "No"},
        "severity": {"severity_level": "mild", "severity_code": 1, "severity_label": "Mild Mastitis"},
    }

    pdf_bytes = generator.generate_pdf(prediction_result, report_id="RPT-TEST-004")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_case_5_zero_numerical_values(generator):
    """Test PDF generation for Case 5 (0/6 measurements -> Image-only)."""
    prediction_result = {
        "prediction": "Normal",
        "confidence": 0.88,
        "stage": "No Mastitis",
        "mode": "image_only",
        "model_2_used": False,
        "numerical_model_type": "unavailable",
        "missing_numerical_features": [],
        "image_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.88},
        "numerical_prediction": None,
        "numerical_measurements": None,
        "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
    }

    pdf_bytes = generator.generate_pdf(prediction_result, report_id="RPT-TEST-005")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_critical_case_alert(generator):
    """Test PDF generation for Case 6 (Critical / Severe Mastitis case with alert banner)."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.98,
        "stage": "Severe Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "numerical_model_type": "complete",
        "missing_numerical_features": [],
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.99},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.97, "model": "MLP Numerical Network (Model 2)"},
        "numerical_measurements": {"milk_temperature": 40.5, "milk_ph": 7.3, "milk_conductivity": 8.5, "somatic_cell_count": 980, "milk_yield": 5.0, "clotting": "Yes"},
        "clinical_observations": {"milk_yield_change": "Severe drop", "milk_appearance": "Clots and blood", "udder_swelling": "Severe", "udder_warmth": "Severe", "udder_pain": "Severe", "body_temperature": "High fever (40.5°C)", "appetite": "Loss of appetite"},
        "severity": {"severity_level": "severe", "severity_code": 3, "severity_label": "Severe Mastitis"},
    }
    cattle_info = {"tag_id": "COW-999", "name": "Luna", "breed": "Jersey", "age": 5}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, report_id="RPT-CRITICAL-999")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_api_endpoint(client):
    """Test POST /api/report/generate-pdf returns 200 and application/pdf."""
    payload = {
        "result": {
            "prediction": "Normal",
            "confidence": 0.91,
            "stage": "No Mastitis",
            "mode": "image_only",
            "model_2_used": False,
            "image_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.91},
            "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
        },
        "cattle_info": {"tag_id": "COW-API-01", "name": "Molly"},
        "farmer_info": {"name": "Farmer Joe"},
        "report_id": "RPT-API-TEST",
    }

    response = client.post("/api/report/generate-pdf", json=payload)
    assert response.status_code == 200
    assert response.headers.get("Content-Type") == "application/pdf"
    assert len(response.data) > 5000
    assert response.data.startswith(b"%PDF-")
