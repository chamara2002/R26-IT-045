import io
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.app import app


def test_missing_image_returns_400():
    client = app.test_client()
    response = client.post("/api/predict/assisted", data={"symptoms": "{}"})
    assert response.status_code == 400
    assert "No image provided" in response.get_json()["error"]


def test_weather_dashboard_page_renders():
    client = app.test_client()
    response = client.get("/weather/dashboard")

    assert response.status_code == 200
    assert "Weather-based FMD Novelty Dashboard" in response.get_data(as_text=True)


def test_valid_image_returns_prediction_payload():
    client = app.test_client()

    image = np.zeros((160, 160, 3), dtype=np.uint8)
    image[:] = (255, 255, 255)
    _, image_bytes = cv2.imencode(".jpg", image)

    data = {
        "symptoms": "{\"high_fever\": true, \"lesions_in_mouth\": true}",
        "body_temperature": "39.5",
    }
    response = client.post(
        "/api/predict/assisted",
        data={**data, "image": (io.BytesIO(image_bytes.tobytes()), "test.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert set(["disease", "predicted_label", "risk_level", "confidence", "advice"]).issubset(payload.keys())
