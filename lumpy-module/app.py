import base64
import json
import os
import uuid

import cv2
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import Config, format_api_response, get_config, risk_guidance
from inference import pipeline as vision_pipeline
from inference.fusion import fuse_predictions
from inference.report import build_pdf_report
from inference.symptoms import assess_symptoms

app = Flask(__name__)
CORS(app)

config = get_config()
app.config["MAX_CONTENT_LENGTH"] = config.MAX_UPLOAD_SIZE
config.UPLOAD_DIR.mkdir(exist_ok=True)

MODELS_LOAD_ERROR = None
try:
    vision_pipeline.load_models()
    print("Loaded YOLOv8 + ResNet50 LSD pipeline")
except Exception as exc:
    MODELS_LOAD_ERROR = str(exc)
    print(f"LSD models failed to load: {exc}")


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_EXTENSIONS


import numpy as np


def _decode_image(image_file):
    """Decode an uploaded image directly from memory with OpenCV."""
    if not image_file.filename or not _allowed_file(image_file.filename):
        raise ValueError(f"Invalid file format. Allowed: {sorted(config.ALLOWED_EXTENSIONS)}")

    file_bytes = image_file.read()
    if not file_bytes:
        raise ValueError("Uploaded image file is empty")

    np_arr = np.frombuffer(file_bytes, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise ValueError("Could not decode image file. Please provide a valid JPEG or PNG.")
    return image_bgr


# Flat symptom fields as sent by the CattleSense frontend / backend proxy,
# mapped to the keys inference.symptoms.assess_symptoms expects. The older
# contract instead packed these into a single JSON "symptoms" form field.
_FLAT_SYMPTOM_FIELDS = {
    "swollen_lymph_nodes": "swollen_lymph_nodes",
    "high_fever": "high_fever",
    "nose_discharge": "nose_discharge",
    "eye_discharge": "eye_discharge",
    "reduced_milk_production": "reduced_milk",
    "decreased_appetite": "decreased_appetite",
    "body_temperature": "body_temperature",
}


def _parse_symptoms():
    raw = request.form.get("symptoms")
    if raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("symptoms must be valid JSON") from exc
        if not isinstance(parsed, dict):
            raise ValueError("symptoms must be a JSON object")
        return parsed

    # Fall back to flat form fields (swollen_lymph_nodes=true, body_temperature=40.2, ...).
    collected = {
        scorer_key: request.form.get(form_key)
        for form_key, scorer_key in _FLAT_SYMPTOM_FIELDS.items()
        if form_key in request.form
    }
    return collected or None


def _encode_annotated_image(image_bgr):
    success, buffer = cv2.imencode(".jpg", image_bgr)
    if not success:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")


def _build_result(image_bgr, symptoms_raw):
    """Run the vision pipeline, optionally fuse it with symptoms, and shape the response."""
    vision_result = vision_pipeline.run_image_pipeline(image_bgr)
    symptom_result = assess_symptoms(symptoms_raw) if symptoms_raw is not None else None
    fusion = fuse_predictions(vision_result["probability"], symptom_result, config.IMAGE_WEIGHT)

    overall_probability = fusion["probability"]
    risk_level, guidance = risk_guidance(overall_probability)
    # Decision threshold matches the proposal's own Low/Moderate risk boundary
    # (Section 3.6) rather than an arbitrary 0.5 cutoff — see
    # ipynb files/INTEGRATED_PIPELINE_v4_Final.ipynb for why.
    overall_label = 1 if overall_probability >= Config.LOW_RISK_MAX else 0
    prediction_label = "LSD Positive" if overall_label == 1 else "Healthy"

    annotated_image = None
    if vision_result["regions"]:
        annotated_bgr = vision_pipeline.annotate_image(image_bgr, vision_result["regions"])
        annotated_image = _encode_annotated_image(annotated_bgr)

    # Never expose the raw per-region classification_probability — it is
    # currently overconfident/miscalibrated (see inference/pipeline.py docstring).
    public_regions = [
        {"bbox": region["bbox"], "detection_confidence": round(region["detection_confidence"], 4)}
        for region in vision_result["regions"]
    ]

    return {
        "disease": "lumpy",
        "prediction": prediction_label,
        "predicted_class": prediction_label,
        "stage": risk_level,
        "risk_level": risk_level,
        "confidence": round(overall_probability, 4),
        "confidence_score": round(overall_probability, 4),
        "recommendation": guidance,
        "advice": guidance,
        "num_detections": vision_result["num_detections"],
        "regions": public_regions,
        "annotated_image": annotated_image,
        "image_prediction": {
            "probability": round(vision_result["probability"], 4),
            "num_detections": vision_result["num_detections"],
        },
        "symptom_prediction": symptom_result,
        "overall_prediction": {
            "label": overall_label,
            "confidence": round(overall_probability, 4),
            "probability": round(overall_probability, 4),
            "image_weight": fusion["image_weight"],
            "symptom_weight": fusion["symptom_weight"],
            "sources_used": fusion["sources_used"],
        },
    }


@app.get("/health")
def health_check():
    return jsonify(
        {
            "status": "ok" if MODELS_LOAD_ERROR is None else "degraded",
            "service": "lumpy-module",
            "models_loaded": MODELS_LOAD_ERROR is None,
            "error": MODELS_LOAD_ERROR,
        }
    )


@app.post("/predict")
def predict_legacy():
    """Legacy JSON-only contract for callers that don't send an image."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    return (
        jsonify(
            {
                "disease": "lumpy",
                "stage": "unknown",
                "confidence": 0.0,
                "advice": "Upload a skin photograph via /api/predict/assisted for a real diagnosis.",
            }
        ),
        200,
    )


@app.post("/api/predict/image")
def predict_image_only():
    """Predict LSD from an uploaded image using the vision pipeline only."""
    if MODELS_LOAD_ERROR:
        return jsonify(
            format_api_response(False, "Prediction pipeline not initialized", error=MODELS_LOAD_ERROR)
        ), 500

    if "image" not in request.files:
        return jsonify(format_api_response(False, "Missing required field: image", error="No image provided")), 400

    try:
        image_bgr = _decode_image(request.files["image"])
        result = _build_result(image_bgr, symptoms_raw=None)
        return jsonify(format_api_response(True, "Image prediction successful", data=result))
    except ValueError as exc:
        return jsonify(format_api_response(False, "Error processing image", error=str(exc))), 400
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify(format_api_response(False, "Prediction failed", error=str(exc))), 500


@app.post("/api/predict/assisted")
def predict_assisted():
    """Predict LSD from an image plus an optional symptom checklist.

    Fuses the vision pipeline and symptom score using Config.IMAGE_WEIGHT
    (default 70% image / 30% symptoms) — see inference/fusion.py.
    """
    if MODELS_LOAD_ERROR:
        return jsonify(
            format_api_response(False, "Prediction pipeline not initialized", error=MODELS_LOAD_ERROR)
        ), 500

    if "image" not in request.files:
        return jsonify(format_api_response(False, "Missing required field: image", error="No image provided")), 400

    try:
        image_bgr = _decode_image(request.files["image"])
        symptoms_raw = _parse_symptoms()
        result = _build_result(image_bgr, symptoms_raw)

        input_summary = {"symptoms_provided": result["symptom_prediction"] is not None}
        if symptoms_raw is not None:
            input_summary["symptoms"] = symptoms_raw
        result["input_summary"] = input_summary

        return jsonify(format_api_response(True, "Assisted prediction successful", data=result))
    except ValueError as exc:
        return jsonify(format_api_response(False, "Error processing request", error=str(exc))), 400
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify(format_api_response(False, "Assisted prediction failed", error=str(exc))), 500


@app.post("/api/report/pdf")
def report_pdf():
    """Build a downloadable PDF report from a previously-computed prediction result.

    Takes the same result payload /api/predict/assisted already returned —
    no re-inference needed, so this is cheap and fast.
    """
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload.get("result"), dict):
        return jsonify(format_api_response(False, "Missing result data", error="No result provided")), 400

    try:
        pdf_bytes = build_pdf_report(payload["result"])
    except Exception as exc:
        return jsonify(format_api_response(False, "Failed to generate report", error=str(exc))), 500

    response = app.response_class(pdf_bytes, mimetype="application/pdf")
    response.headers["Content-Disposition"] = "attachment; filename=lsd_detection_report.pdf"
    return response


@app.route("/api/info", methods=["GET"])
def api_info():
    return jsonify(
        format_api_response(
            True,
            "API information",
            data={
                "title": config.API_TITLE,
                "version": config.API_VERSION,
                "image_size": config.RESNET_IMG_SIZE,
                "image_weight": config.IMAGE_WEIGHT,
                "symptom_weight": config.SYMPTOM_WEIGHT,
                "conf_threshold": config.CONF_THRESHOLD,
                "iou_threshold": config.IOU_THRESHOLD,
            },
        )
    )


if __name__ == "__main__":
    port = int(os.getenv("LUMPY_PORT", "5003"))
    app.run(host="0.0.0.0", port=port, debug=config.DEBUG)
