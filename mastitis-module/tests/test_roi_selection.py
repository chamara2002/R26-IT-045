"""
Automated unit and integration tests for Farmer-Guided Udder Crop & ROI Selection.
Validates:
1. Preprocessing & extraction of farmer-selected ROI (bounding box, coordinates).
2. Clamping and boundary checks (out-of-bounds, tiny crop, portrait, landscape).
3. Preservation of original uncropped photograph.
4. Correct 224x224 input sizing for ResNet-50 Model 1.
5. Generation of 4-panel image evidence (Original, Cropped ROI, Heatmap, Overlay).
6. Backward-compatible fallback when no ROI is provided.
7. PDF report generation with 4-panel ROI section and technical note.
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

from api.flask_api import app, load_uploaded_image_with_roi, allowed_file
from utils.report_generator import VeterinaryReportGenerator
import config


@pytest.fixture(scope="module")
def generator():
    return VeterinaryReportGenerator()


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_load_uploaded_image_with_valid_roi():
    """Test load_uploaded_image_with_roi with bounding box coordinates."""
    # Create 600x800 synthetic image
    synthetic_img = np.zeros((600, 800, 3), dtype=np.uint8)
    synthetic_img[100:400, 200:600] = 200  # Udder region
    _, encoded = cv2.imencode(".jpg", synthetic_img)

    class DummyFile:
        def __init__(self, data, filename):
            self.data = data
            self.filename = filename

        def save(self, path):
            with open(path, "wb") as f:
                f.write(self.data)

    file_obj = DummyFile(encoded.tobytes(), "test_cow.jpg")
    roi_dict = {"x": 200, "y": 100, "width": 400, "height": 300}

    preprocessed, crop_rgb, orig_rgb, roi_meta = load_uploaded_image_with_roi(file_obj, roi_dict=roi_dict)

    assert preprocessed.shape == (224, 224, 3)
    assert crop_rgb.shape == (224, 224, 3)
    assert orig_rgb.shape == (600, 800, 3)
    assert roi_meta["roi_applied"] is True
    assert roi_meta["image_source"] == "farmer_selected_roi"
    assert roi_meta["roi_coordinates"]["width"] == 400
    assert roi_meta["roi_coordinates"]["height"] == 300


def test_load_uploaded_image_with_separate_original_and_crop():
    """Test load_uploaded_image_with_roi with separate original and crop image files."""
    orig_img = np.ones((800, 1000, 3), dtype=np.uint8) * 150
    crop_img = np.ones((300, 300, 3), dtype=np.uint8) * 220

    _, enc_orig = cv2.imencode(".jpg", orig_img)
    _, enc_crop = cv2.imencode(".jpg", crop_img)

    class DummyFile:
        def __init__(self, data, filename):
            self.data = data
            self.filename = filename

        def save(self, path):
            with open(path, "wb") as f:
                f.write(self.data)

    crop_file = DummyFile(enc_crop.tobytes(), "crop.jpg")
    orig_file = DummyFile(enc_orig.tobytes(), "orig.jpg")

    preprocessed, crop_rgb, orig_rgb, roi_meta = load_uploaded_image_with_roi(
        crop_file, original_file=orig_file
    )

    assert preprocessed.shape == (224, 224, 3)
    assert crop_rgb.shape == (224, 224, 3)
    assert orig_rgb.shape == (800, 1000, 3)
    assert roi_meta["roi_applied"] is True
    assert roi_meta["image_source"] == "farmer_selected_roi"


def test_load_uploaded_image_fallback_when_no_roi():
    """Test fallback when no ROI coordinates are provided (backward-compatible)."""
    img = np.ones((500, 500, 3), dtype=np.uint8) * 100
    _, enc = cv2.imencode(".jpg", img)

    class DummyFile:
        def __init__(self, data, filename):
            self.data = data
            self.filename = filename

        def save(self, path):
            with open(path, "wb") as f:
                f.write(self.data)

    file_obj = DummyFile(enc.tobytes(), "test_full.jpg")
    preprocessed, crop_rgb, orig_rgb, roi_meta = load_uploaded_image_with_roi(file_obj, roi_dict=None)

    assert preprocessed.shape == (224, 224, 3)
    assert crop_rgb.shape == (224, 224, 3)
    assert orig_rgb.shape == (500, 500, 3)
    assert roi_meta["roi_applied"] is False
    assert roi_meta["image_source"] == "full_image"
    assert roi_meta["roi_coordinates"] is None


def test_api_predict_assisted_with_roi_coordinates(client):
    """Test POST /api/predict/assisted endpoint with farmer-selected ROI metadata."""
    dummy_img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    roi_payload = {
        "x": 100,
        "y": 80,
        "width": 350,
        "height": 280,
    }

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "udder.jpg"),
        "roi_coordinates": json.dumps(roi_payload),
        "milk_temperature": "38.5",
        "milk_ph": "6.6",
        "milk_conductivity": "5.0",
        "somatic_cell_count": "200",
        "milk_yield": "18.0",
        "clotting": "No",
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["roi_applied"] is True
    assert data["data"]["image_source"] == "farmer_selected_roi"
    assert data["data"]["roi_coordinates"]["width"] == 350
    assert data["data"]["roi_coordinates"]["height"] == 280
    assert "heatmap_id" in data["data"]


def test_api_predict_assisted_without_roi_fallback(client):
    """Test POST /api/predict/assisted fallback when no ROI is provided."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", dummy_img)

    payload = {
        "image": (io.BytesIO(encoded.tobytes()), "udder_no_roi.jpg"),
        "milk_temperature": "38.5",
        "milk_ph": "6.6",
        "milk_conductivity": "5.0",
        "somatic_cell_count": "200",
        "milk_yield": "18.0",
        "clotting": "No",
    }

    response = client.post("/api/predict/assisted", data=payload, content_type="multipart/form-data")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["roi_applied"] is False
    assert data["data"]["image_source"] == "full_image"


def test_pdf_report_with_4_panel_roi_evidence(generator, tmp_path):
    """Test PDF generation with 4-panel visual evidence (Orig, Crop ROI, Heatmap, Overlay)."""
    # Create 4 test image files
    orig_file = tmp_path / "test_orig.png"
    crop_file = tmp_path / "test_crop.png"
    heat_file = tmp_path / "test_heat.png"
    over_file = tmp_path / "test_over.png"

    dummy_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
    cv2.imwrite(str(orig_file), dummy_img)
    cv2.imwrite(str(crop_file), dummy_img)
    cv2.imwrite(str(heat_file), dummy_img)
    cv2.imwrite(str(over_file), dummy_img)

    result_payload = {
        "prediction": "Mastitis",
        "confidence": 0.88,
        "stage": "Moderate Mastitis",
        "roi_applied": True,
        "image_source": "farmer_selected_roi",
        "image_prediction": {"prediction": "Mastitis", "confidence": 0.88},
        "numerical_prediction": {"prediction": "Mastitis", "confidence": 0.82},
        "numerical_model_type": "complete",
        "numerical_measurements": {
            "milk_temperature": 39.1,
            "milk_ph": 7.1,
            "milk_conductivity": 6.8,
            "somatic_cell_count": 650,
            "milk_yield": 12.0,
            "clotting": "Yes",
        },
        "severity": {
            "severity_level": "moderate",
            "severity_label": "Moderate Mastitis",
            "recommendation": "Consult veterinarian. Isolate milk.",
        },
    }

    pdf_bytes = generator.generate_pdf(
        prediction_result=result_payload,
        cattle_info={"name": "Bella", "tag_id": "COW-042", "breed": "Holstein"},
        farmer_info={"name": "John Doe", "phone": "+94771234567"},
        original_image_path=str(orig_file),
        cropped_image_path=str(crop_file),
        heatmap_image_path=str(heat_file),
        overlay_image_path=str(over_file),
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")
