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


def test_report_generation_case_1_normal(generator):
    """Test PDF generation for Normal case."""
    prediction_result = {
        "prediction": "Normal",
        "confidence": 0.92,
        "stage": "No Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.94},
        "numerical_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.90, "model": "Decision Tree Classifier (Model 2)"},
        "numerical_measurements": {"Milk_Temperature": 36.2, "Milk_pH": 6.65, "Milk_Conductivity": 4.85, "Milk_Yield": 18.5, "Clotting": 0},
        "clinical_observations": {"milk_yield_change": "Normal", "milk_appearance": "Normal", "udder_swelling": "No", "udder_warmth": "No", "udder_pain": "No", "body_temperature": "38.5°C", "appetite": "Normal"},
        "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
    }
    cattle_info = {"tag_id": "COW-101", "name": "Bella", "breed": "Jersey", "age": 4}
    farmer_info = {"name": "John Doe", "farm_name": "Sunrise Dairy"}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, farmer_info, report_id="RPT-TEST-001")
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_case_2_mastitis(generator):
    """Test PDF generation for Mastitis case."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.84,
        "stage": "Moderate Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.81},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.87, "model": "Decision Tree Classifier (Model 2)"},
        "numerical_measurements": {"Milk_Temperature": 38.5, "Milk_pH": 7.15, "Milk_Conductivity": 6.75, "Milk_Yield": 10.5, "Clotting": 1},
        "clinical_observations": {"milk_yield_change": "Mild drop", "milk_appearance": "Slightly watery", "udder_swelling": "Mild", "udder_warmth": "Yes", "udder_pain": "Mild", "body_temperature": "39.4°C", "appetite": "Normal"},
        "severity": {"severity_level": "moderate", "severity_code": 2, "severity_label": "Moderate Mastitis"},
    }

    pdf_bytes = generator.generate_pdf(prediction_result, report_id="RPT-TEST-002")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_critical_case_alert(generator):
    """Test PDF generation for Critical / Severe Mastitis case with alert banner."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.98,
        "stage": "Severe Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.99},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.97, "model": "Decision Tree Classifier (Model 2)"},
        "numerical_measurements": {"Milk_Temperature": 39.2, "Milk_pH": 7.35, "Milk_Conductivity": 7.80, "Milk_Yield": 5.0, "Clotting": 1},
        "clinical_observations": {"milk_yield_change": "Severe drop", "milk_appearance": "Clots and blood", "udder_swelling": "Severe", "udder_warmth": "Severe", "udder_pain": "Severe", "body_temperature": "High fever (40.5°C)", "appetite": "Loss of appetite"},
        "severity": {"severity_level": "severe", "severity_code": 3, "severity_label": "Severe Mastitis"},
    }
    cattle_info = {"tag_id": "COW-999", "name": "Luna", "breed": "Jersey", "age": 5}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, report_id="RPT-CRITICAL-999")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_api_endpoint(client):
    """Test POST /api/report/generate-pdf returns a downloadable application/pdf stream."""
    payload = {
        "result": {
            "prediction": "Normal",
            "confidence": 0.91,
            "stage": "No Mastitis",
            "numerical_measurements": {
                "Milk_Temperature": 36.5,
                "Milk_pH": 6.7,
                "Milk_Conductivity": 4.8,
                "Milk_Yield": 18.0,
                "Clotting": 0,
            },
            "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
        },
        "cattle_info": {"tag_id": "COW-555", "name": "Molly"},
        "farmer_info": {"name": "Farmer Sam"},
    }

    response = client.post("/api/report/generate-pdf", json=payload)
    assert response.status_code == 200
    assert response.mimetype == "application/pdf"
    assert response.data.startswith(b"%PDF-")
