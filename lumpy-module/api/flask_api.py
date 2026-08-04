"""
Flask REST API for Lumpy Skin Disease (LSD) Detection.

Component 3 - IT22282422 (Manathunga M.A.A.S). Serves the locally-trained
ResNet-50 image classifier, fused with an optional farmer-reported symptom
checklist, following the pipeline described in the LSD component proposal
(Chapter 3.6): image upload -> preprocessing -> classification -> probability
percentage + risk-based guidance + downloadable report data.
"""
import base64
import io
import os
import sys
import threading
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image
from werkzeug.utils import secure_filename

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from inference.api_config import get_config, format_api_response
from inference.resnet_classifier import ResNetLSDClassifier
from inference.symptom_engine import fuse_prediction

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/predict": {"origins": "*"}})

config = get_config()
app.config["MAX_CONTENT_LENGTH"] = config.MAX_UPLOAD_SIZE

config.UPLOAD_DIR.mkdir(exist_ok=True)
HEATMAP_DIR = config.UPLOAD_DIR / "heatmaps"
HEATMAP_DIR.mkdir(exist_ok=True)

classifier = None
gradcam_explainer = None

try:
    classifier = ResNetLSDClassifier()
    print(f"[LSD] ResNet-50 classifier loaded from {classifier.weights_path}")
except Exception as e:
    print(f"[LSD] ERROR loading classifier: {e}")

if classifier is not None:
    try:
        from utils.gradcam_explainer import GradCAMExplainer
        gradcam_explainer = GradCAMExplainer(classifier.model)
        print("[LSD] Grad-CAM explainer ready")
    except Exception as e:
        print(f"[LSD] Grad-CAM unavailable: {e}")


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_EXTENSIONS


def load_uploaded_image(image_file):
    """Validate and load an uploaded image file into a PIL.Image (RGB)."""
    if not allowed_file(image_file.filename):
        raise ValueError(f"Invalid file format. Allowed: {sorted(config.ALLOWED_EXTENSIONS)}")

    filename = f"{uuid.uuid4().hex}_{secure_filename(image_file.filename)}"
    filepath = config.UPLOAD_DIR / filename
    image_file.save(str(filepath))

    try:
        image = Image.open(filepath).convert("RGB")
        image.load()
        return image
    finally:
        if filepath.exists():
            os.remove(filepath)


def parse_symptoms_field():
    """Parse the optional 'symptoms' JSON string sent by the LSD form."""
    raw = request.form.get("symptoms")
    if not raw:
        return None
    import json
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("symptoms must be valid JSON") from exc
    if not isinstance(parsed, dict):
        raise ValueError("symptoms must be a JSON object")
    return parsed


def build_prediction_payload(image, symptoms):
    label, confidence, lsd_probability = classifier.predict(image)
    fusion = fuse_prediction(lsd_probability, symptoms, image_weight=config.IMAGE_WEIGHT)

    overall_probability = fusion["overall_probability"]
    overall_label = 1 if overall_probability >= 0.5 else 0

    return {
        "prediction": "Lumpy Skin Disease Detected" if overall_label == 1 else "Healthy Skin - No Signs of LSD",
        "label": overall_label,
        "confidence": overall_probability,
        "stage": fusion["risk_label"],
        "risk_level": fusion["risk_level"],
        "message": fusion["recommendation"],
        "recommendation": fusion["recommendation"],
        "image_prediction": {
            "label": label,
            "class_name": config.CLASS_NAMES[label],
            "confidence": confidence,
            "lsd_probability": lsd_probability,
        },
        "symptom_assessment": fusion["symptom_assessment"],
        "overall_prediction": {
            "label": overall_label,
            "confidence": overall_probability,
            "sources_used": fusion["sources_used"],
            "image_weight": fusion["image_weight"],
        },
    }


def generate_and_save_gradcam(input_tensor, original_rgb_224, out_path):
    """Generate a Grad-CAM overlay PNG for the LSD class and save it to out_path."""
    try:
        if gradcam_explainer is None:
            return
        heatmap = gradcam_explainer.generate_gradcam(input_tensor, class_idx=1)
        overlay = gradcam_explainer.overlay_gradcam(original_rgb_224, heatmap)
        import cv2
        cv2.imwrite(str(out_path), overlay)
    except Exception as e:
        print(f"[LSD][Grad-CAM] ERROR: {type(e).__name__}: {e}")


# ============= API ENDPOINTS =============

@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify(format_api_response(
        True, "API is running",
        data={"status": "healthy", "version": config.API_VERSION, "model_loaded": classifier is not None},
    ))


@app.route("/api/predict/image", methods=["POST"])
def predict_image_only():
    """Predict LSD from an uploaded image using the ResNet-50 classifier only."""
    if classifier is None:
        return jsonify(format_api_response(False, "Classifier not initialized", error="Model loading failed")), 500

    if "image" not in request.files:
        return jsonify(format_api_response(False, "Missing required field: image", error="No image provided")), 400

    try:
        image = load_uploaded_image(request.files["image"])
        payload = build_prediction_payload(image, symptoms=None)
        return jsonify(format_api_response(True, "Image prediction successful", data=payload))
    except Exception as e:
        return jsonify(format_api_response(False, "Image prediction failed", error=str(e))), 400


@app.route("/api/predict/assisted", methods=["POST"])
def predict_assisted():
    """Predict LSD from image plus optional farmer-reported symptom checklist."""
    if classifier is None:
        return jsonify(format_api_response(False, "Classifier not initialized", error="Model loading failed")), 500

    if "image" not in request.files:
        return jsonify(format_api_response(False, "Missing required field: image", error="No image provided")), 400

    try:
        image_file = request.files["image"]
        filename = f"{uuid.uuid4().hex}_{secure_filename(image_file.filename)}"
        filepath = config.UPLOAD_DIR / filename
        image_file.save(str(filepath))

        try:
            image = Image.open(filepath).convert("RGB")
            image.load()
        finally:
            if filepath.exists():
                os.remove(filepath)

        symptoms = parse_symptoms_field()
        payload = build_prediction_payload(image, symptoms)

        # Kick off asynchronous Grad-CAM generation (non-blocking)
        heatmap_id = None
        if gradcam_explainer is not None:
            try:
                input_tensor = classifier.preprocess(image).clone().requires_grad_(False)
                resized_rgb = image.resize(config.IMAGE_SIZE)
                import numpy as np
                original_rgb_224 = np.array(resized_rgb)

                heatmap_id = str(uuid.uuid4())
                out_path = HEATMAP_DIR / f"{heatmap_id}.png"

                def worker():
                    tensor_for_grad = input_tensor.clone().requires_grad_(True)
                    generate_and_save_gradcam(tensor_for_grad, original_rgb_224, out_path)

                threading.Thread(target=worker, daemon=True).start()
            except Exception as e:
                print(f"[LSD] Could not start Grad-CAM thread: {e}")
                heatmap_id = None

        if heatmap_id is not None:
            payload["heatmap_id"] = heatmap_id

        return jsonify(format_api_response(True, "Assisted prediction successful", data=payload))
    except Exception as e:
        return jsonify(format_api_response(False, "Assisted prediction failed", error=str(e))), 400


@app.route("/api/heatmap/<heatmap_id>", methods=["GET"])
def get_heatmap(heatmap_id):
    """Serve the generated Grad-CAM overlay PNG when ready."""
    path = HEATMAP_DIR / f"{heatmap_id}.png"
    if path.exists():
        return send_file(str(path), mimetype="image/png")
    return jsonify(format_api_response(False, "Heatmap not ready", error="Not ready")), 202


# ---- Legacy contract kept for the shared module-gateway `/predict` route ----

@app.get("/health")
def health_check():
    return jsonify({"status": "ok", "service": "lumpy-module", "model_loaded": classifier is not None})


@app.post("/predict")
def predict_legacy():
    """JSON contract expected by services/module_proxy_service.predict_from_module:
    {disease, stage, confidence, advice}. Expects base64 image in 'image_base64'.
    """
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    if classifier is None:
        return jsonify({"error": "Classifier not initialized"}), 500

    image_b64 = payload.get("image_base64")
    if not image_b64:
        return jsonify({"error": "Missing required field: image_base64"}), 400

    try:
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"Could not decode image_base64: {e}"}), 400

    symptoms = payload.get("symptoms")
    result = build_prediction_payload(image, symptoms)

    return jsonify({
        "disease": "lumpy",
        "stage": result["risk_level"],
        "confidence": result["confidence"],
        "advice": result["recommendation"],
    }), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify(format_api_response(False, "Endpoint not found", error="404 Not Found")), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify(format_api_response(False, "Internal server error", error="500 Server Error")), 500


if __name__ == "__main__":
    server_port = int(os.getenv("LUMPY_PORT", "5003"))
    print(f"\n{'=' * 70}")
    print("LUMPY SKIN DISEASE DETECTION API")
    print(f"{'=' * 70}")
    print(f"Starting Flask server on http://localhost:{server_port}")
    print(f"{'=' * 70}\n")
    app.run(debug=False, host="0.0.0.0", port=server_port)
