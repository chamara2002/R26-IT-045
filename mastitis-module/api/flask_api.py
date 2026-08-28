"""
Flask REST API for CattleSense Mastitis Detection Module.
Provides endpoints for image-based CNN prediction (Model 1),
numerical Logistic Regression Pipeline prediction (Model 2), multimodal fusion, and Grad-CAM visualization.
"""
import sys
from pathlib import Path
import os
import json
import uuid
import threading
import numpy as np
import cv2
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.config import (
    Config,
    get_config,
    validate_numerical_measurements,
    format_api_response,
)
from preprocessing.image_preprocessing import preprocess_image_for_model1, letterbox_resize
from inference.prediction_pipeline import PredictionPipeline
from utils.gradcam_explainer import GradCAMExplainer
from utils.severity_engine import MastitisSeverityEngine
from utils.report_generator import VeterinaryReportGenerator
from utils.symptom_assessor import evaluate_symptoms
from utils.udder_validator import UdderValidator
from datetime import datetime
import io

app = Flask(__name__)
config = get_config()

if config.ENABLE_CORS:
    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/predict": {"origins": "*"}})

app.config['MAX_CONTENT_LENGTH'] = config.MAX_UPLOAD_SIZE

# Upload and heatmap directories
config.UPLOAD_DIR.mkdir(exist_ok=True)
HEATMAP_DIR = config.UPLOAD_DIR / "heatmaps"
HEATMAP_DIR.mkdir(exist_ok=True)

# Initialize pipeline, Grad-CAM, severity engine, udder validator, and report generator
pipeline = PredictionPipeline()
gradcam_explainer = None
severity_engine = MastitisSeverityEngine()
report_generator = VeterinaryReportGenerator()
udder_validator = UdderValidator(
    cnn_model=pipeline.fusion_model.cnn_model if pipeline.fusion_model.is_image_model_ready else None,
    centroid_path=config.MODEL_DIR / "model1" / "udder_reference_centroid.npy",
    similarity_threshold=0.51
)

if pipeline.fusion_model.is_image_model_ready:
    try:
        gradcam_explainer = GradCAMExplainer(pipeline.fusion_model.cnn_model)
        print("✓ Grad-CAM explainer initialized with Model 1")
    except Exception as e:
        print(f"⚠ Grad-CAM initialization: {e}")


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def parse_roi_payload():
    """
    Parse ROI coordinates if provided by farmer in request.
    Supports JSON string under 'roi', 'roi_coordinates', or individual form fields:
    roi_x, roi_y, roi_width, roi_height.
    """
    roi_raw = (
        request.form.get("roi")
        or request.form.get("roi_coordinates")
        or request.form.get("crop")
    )
    if roi_raw:
        if isinstance(roi_raw, str):
            try:
                parsed = json.loads(roi_raw)
                if isinstance(parsed, dict) and "x" in parsed:
                    return {
                        "x": int(float(parsed.get("x", 0))),
                        "y": int(float(parsed.get("y", 0))),
                        "width": int(float(parsed.get("width") or parsed.get("w", 0))),
                        "height": int(float(parsed.get("height") or parsed.get("h", 0))),
                    }
            except Exception:
                pass
        elif isinstance(roi_raw, dict):
            return {
                "x": int(float(roi_raw.get("x", 0))),
                "y": int(float(roi_raw.get("y", 0))),
                "width": int(float(roi_raw.get("width") or roi_raw.get("w", 0))),
                "height": int(float(roi_raw.get("height") or roi_raw.get("h", 0))),
            }

    # Check individual fields
    if request.form.get("roi_x") and request.form.get("roi_y"):
        try:
            return {
                "x": int(float(request.form.get("roi_x", 0))),
                "y": int(float(request.form.get("roi_y", 0))),
                "width": int(float(request.form.get("roi_width", 0))),
                "height": int(float(request.form.get("roi_height", 0))),
            }
        except (ValueError, TypeError):
            pass

    return None


def load_uploaded_image_with_roi(image_file, original_file=None, roi_dict=None):
    """
    Load, validate, and extract ROI from uploaded image.
    Supports:
    1. Cropped image + original image files
    2. Single image + ROI coordinates
    3. Single image without ROI (fallback / backward-compatible)

    Returns:
      preprocessed_crop: (224, 224, 3) float32 normalized for ResNet-50 Model 1
      resized_crop_rgb: (224, 224, 3) uint8 cropped ROI for Grad-CAM overlay
      orig_rgb: Full-resolution original uint8 RGB image for reporting & storage
      roi_meta: dict containing { 'roi_applied': bool, 'image_source': str, 'roi_coordinates': dict|None }
    """
    if not allowed_file(image_file.filename):
        raise ValueError(f"Invalid file format. Allowed formats: {', '.join(config.ALLOWED_EXTENSIONS)}")

    tmp_filename = f"{uuid.uuid4().hex}_{secure_filename(image_file.filename)}"
    tmp_path = config.UPLOAD_DIR / tmp_filename
    image_file.save(str(tmp_path))

    orig_tmp_path = None
    if original_file and hasattr(original_file, "filename") and original_file.filename and allowed_file(original_file.filename):
        orig_filename = f"orig_{uuid.uuid4().hex}_{secure_filename(original_file.filename)}"
        orig_tmp_path = config.UPLOAD_DIR / orig_filename
        original_file.save(str(orig_tmp_path))

    try:
        main_bgr = cv2.imread(str(tmp_path))
        if main_bgr is None:
            raise ValueError("Could not read uploaded image file")

        main_rgb = cv2.cvtColor(main_bgr, cv2.COLOR_BGR2RGB)

        if orig_tmp_path and orig_tmp_path.exists():
            orig_bgr = cv2.imread(str(orig_tmp_path))
            orig_rgb = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2RGB) if orig_bgr is not None else main_rgb
            crop_rgb = main_rgb
            roi_applied = True
            image_source = "farmer_selected_roi"
        elif roi_dict and roi_dict.get("width", 0) > 0 and roi_dict.get("height", 0) > 0:
            orig_rgb = main_rgb
            orig_h, orig_w = orig_rgb.shape[:2]
            x = max(0, min(orig_w - 10, int(roi_dict.get("x", 0))))
            y = max(0, min(orig_h - 10, int(roi_dict.get("y", 0))))
            w = max(10, min(orig_w - x, int(roi_dict.get("width", orig_w))))
            h = max(10, min(orig_h - y, int(roi_dict.get("height", orig_h))))
            crop_rgb = orig_rgb[y : y + h, x : x + w]
            roi_dict = {"x": x, "y": y, "width": w, "height": h, "image_width": orig_w, "image_height": orig_h}
            roi_applied = True
            image_source = "farmer_selected_roi"
        else:
            orig_rgb = main_rgb
            crop_rgb = orig_rgb
            roi_applied = False
            image_source = "full_image"
            roi_dict = None

        preprocessed_crop, resized_crop_rgb = preprocess_image_for_model1(
            crop_rgb, target_size=config.IMAGE_SIZE
        )

        roi_meta = {
            "roi_applied": roi_applied,
            "image_source": image_source,
            "roi_coordinates": roi_dict,
        }

        return preprocessed_crop, resized_crop_rgb, orig_rgb, roi_meta
    finally:
        if tmp_path.exists():
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        if orig_tmp_path and orig_tmp_path.exists():
            try:
                os.remove(orig_tmp_path)
            except OSError:
                pass


def load_uploaded_image(image_file):
    """Backward-compatible wrapper for single image loading without explicit ROI."""
    preprocessed_crop, resized_crop_rgb, orig_rgb, roi_meta = load_uploaded_image_with_roi(image_file)
    return preprocessed_crop, resized_crop_rgb


def parse_numerical_features(require_all=True, return_warnings=False):
    """
    Parse the 5 mandatory Model 2 features from JSON or form payload:
      1. Milk_Temperature (float, milk temperature in °C)
      2. Milk_pH (float)
      3. Milk_Conductivity (float, mS/cm)
      4. Milk_Yield (float, L/day)
      5. Clotting (int: 0 = No, 1 = Yes)

    Returns clean_dict with exact feature names:
      {"Milk_Temperature": ..., "Milk_pH": ..., "Milk_Conductivity": ..., "Milk_Yield": ..., "Clotting": ...}
    Raises ValueError if any required field is missing or invalid (when require_all=True).
    If return_warnings=True, returns (features_dict_or_None, warnings_list).
    """
    raw_data = {}
    if request.is_json:
        try:
            raw_data = request.get_json(silent=True) or {}
        except Exception:
            raw_data = {}

    # Check for JSON under numerical_measurements / measurements / data / features
    raw_json = (
        request.form.get("numerical_measurements")
        or request.form.get("measurements")
        or request.form.get("data")
        or request.form.get("features")
    )
    if raw_json:
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict):
                raw_data.update(parsed)
        except Exception as exc:
            if require_all:
                raise ValueError("numerical_measurements must be valid JSON") from exc
            warning = "Malformed numerical_measurements JSON — numerical analysis skipped"
            return (None, [warning]) if return_warnings else None

    # Also extract individual form fields
    for field in [
        'Milk_Temperature', 'milk_temperature', 'milkTemperature', 'milk_temp', 'milkTemp',
        'Milk_pH', 'milk_ph', 'milkPh', 'milk_PH', 'pH', 'ph',
        'Milk_Conductivity', 'milk_conductivity', 'milkConductivity', 'conductivity',
        'Milk_Yield', 'milk_yield', 'milkYield', 'yield', 'daily_yield',
        'Clotting', 'clotting', 'milk_clotting', 'milkClotting', 'clots',
    ]:
        if field in request.form and request.form[field] not in (None, "", "null"):
            raw_data[field] = request.form[field]

    # Map aliases to the 5 canonical feature names
    milk_temp_val = (
        raw_data.get('Milk_Temperature')
        if raw_data.get('Milk_Temperature') is not None
        else (
            raw_data.get('milk_temperature')
            if raw_data.get('milk_temperature') is not None
            else (
                raw_data.get('milkTemperature')
                if raw_data.get('milkTemperature') is not None
                else (
                    raw_data.get('milk_temp')
                    if raw_data.get('milk_temp') is not None
                    else raw_data.get('milkTemp')
                )
            )
        )
    )

    milk_ph_val = (
        raw_data.get('Milk_pH')
        if raw_data.get('Milk_pH') is not None
        else (
            raw_data.get('milk_ph')
            if raw_data.get('milk_ph') is not None
            else (
                raw_data.get('milkPh')
                if raw_data.get('milkPh') is not None
                else (
                    raw_data.get('milk_PH')
                    if raw_data.get('milk_PH') is not None
                    else (
                        raw_data.get('pH')
                        if raw_data.get('pH') is not None
                        else raw_data.get('ph')
                    )
                )
            )
        )
    )

    milk_cond_val = (
        raw_data.get('Milk_Conductivity')
        if raw_data.get('Milk_Conductivity') is not None
        else (
            raw_data.get('milk_conductivity')
            if raw_data.get('milk_conductivity') is not None
            else (
                raw_data.get('milkConductivity')
                if raw_data.get('milkConductivity') is not None
                else raw_data.get('conductivity')
            )
        )
    )

    milk_yield_val = (
        raw_data.get('Milk_Yield')
        if raw_data.get('Milk_Yield') is not None
        else (
            raw_data.get('milk_yield')
            if raw_data.get('milk_yield') is not None
            else (
                raw_data.get('milkYield')
                if raw_data.get('milkYield') is not None
                else (
                    raw_data.get('yield')
                    if raw_data.get('yield') is not None
                    else raw_data.get('daily_yield')
                )
            )
        )
    )

    clotting_val = (
        raw_data.get('Clotting')
        if raw_data.get('Clotting') is not None
        else (
            raw_data.get('clotting')
            if raw_data.get('clotting') is not None
            else (
                raw_data.get('milk_clotting')
                if raw_data.get('milk_clotting') is not None
                else (
                    raw_data.get('milkClotting')
                    if raw_data.get('milkClotting') is not None
                    else raw_data.get('clots')
                )
            )
        )
    )

    clean_dict = {
        'Milk_Temperature': milk_temp_val,
        'Milk_pH': milk_ph_val,
        'Milk_Conductivity': milk_cond_val,
        'Milk_Yield': milk_yield_val,
        'Clotting': clotting_val,
    }

    # Check if ANY feature was provided in the payload
    provided_values = [v for v in clean_dict.values() if v not in (None, "", "null")]
    any_provided = len(provided_values) > 0 or bool(raw_json)

    if not any_provided:
        if require_all:
            raise ValueError("Missing required model features: all 5 features are strictly required.")
        return (None, []) if return_warnings else None

    # Validate presence and types
    is_valid, err_msg = validate_numerical_measurements(clean_dict)
    if not is_valid:
        if not require_all:
            warning = f"{err_msg} — numerical analysis skipped"
            return (None, [warning]) if return_warnings else None
        raise ValueError(err_msg)

    # Cast cleanly
    try:
        casted = {
            'Milk_Temperature': float(clean_dict['Milk_Temperature']),
            'Milk_pH': float(clean_dict['Milk_pH']),
            'Milk_Conductivity': float(clean_dict['Milk_Conductivity']),
            'Milk_Yield': float(clean_dict['Milk_Yield']),
            'Clotting': int(clean_dict['Clotting']),
        }
        return (casted, []) if return_warnings else casted
    except Exception as exc:
        if not require_all:
            warning = f"Error casting numerical features: {str(exc)} — numerical analysis skipped"
            return (None, [warning]) if return_warnings else None
        raise ValueError(f"Error casting numerical features: {str(exc)}") from exc


def parse_optional_clinical_observations():
    """
    Parse optional clinical questionnaire observations.
    Questions:
      1. Milk Yield Change: Normal / Decreased
      2. Milk Appearance: Normal / Watery / Clots / Flakes / Blood-stained / Other
      3. Udder Swelling: No / Yes
      4. Udder Warmth: Normal / Increased
      5. Udder Pain: No / Yes
      6. Body Temperature: Normal / High / Not Known
      7. Appetite: Normal / Reduced

    Returns observations_dict or None.
    """
    raw_json = (
        request.form.get("clinical_observations")
        or request.form.get("behavior_signals")
        or request.form.get("behavior")
    )
    raw_data = {}
    if raw_json:
        try:
            raw_data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise ValueError("clinical_observations must be valid JSON") from exc

    symptom_fields = [
        "milk_has_clots",
        "milk_color_changed",
        "udder_feels_warm",
        "udder_swollen",
        "milk_yield_dropped",
        "cow_uneasy_during_milking",
    ]
    # Check both Config.CLINICAL_OBSERVATION_FIELDS and symptom_fields
    all_check_fields = list(Config.CLINICAL_OBSERVATION_FIELDS) + symptom_fields
    for field in all_check_fields:
        camel_field = "".join(w.capitalize() if i > 0 else w for i, w in enumerate(field.split("_")))
        if field in request.form and field not in raw_data:
            raw_data[field] = request.form[field]
        elif camel_field in request.form and field not in raw_data:
            raw_data[field] = request.form[camel_field]

    if not raw_data:
        return None

    observations = {}
    field_mappings = {
        'milk_yield_change': ['milk_yield_change', 'milkYieldChange', 'milk_yield_dropped', 'milkYieldDropped'],
        'milk_appearance': ['milk_appearance', 'milkAppearance', 'milk_color_changed', 'milkColorChanged'],
        'milk_clotting': ['milk_clotting', 'milkClotting', 'milk_has_clots', 'milkHasClots', 'clots_in_milk', 'clotsInMilk'],
        'udder_swelling': ['udder_swelling', 'udderSwelling', 'udder_swollen', 'udderSwollen', 'swollen_udder', 'swollenUdder'],
        'udder_warmth': ['udder_warmth', 'udderWarmth', 'udder_feels_warm', 'udderFeelsWarm'],
        'udder_pain': ['udder_pain', 'udderPain', 'cow_uneasy_during_milking', 'cowUneasyDuringMilking', 'warm_or_painful_udder', 'warmOrPainfulUdder', 'kicking_during_milking', 'kickingDuringMilking'],
        'body_temperature': ['body_temperature', 'bodyTemperature'],
        'appetite': ['appetite', 'reduced_appetite', 'reducedAppetite'],
        'milk_has_clots': ['milk_has_clots', 'milkHasClots'],
        'milk_color_changed': ['milk_color_changed', 'milkColorChanged'],
        'udder_feels_warm': ['udder_feels_warm', 'udderFeelsWarm'],
        'udder_swollen': ['udder_swollen', 'udderSwollen'],
        'milk_yield_dropped': ['milk_yield_dropped', 'milkYieldDropped'],
        'cow_uneasy_during_milking': ['cow_uneasy_during_milking', 'cowUneasyDuringMilking'],
    }

    for standard_key, aliases in field_mappings.items():
        val = None
        for alias in aliases:
            if alias in raw_data and raw_data[alias] not in (None, "", "null"):
                val = raw_data[alias]
                break
        if val is not None:
            if isinstance(val, bool):
                observations[standard_key] = "Yes" if val else "No"
            elif str(val).strip().lower() in ("true", "yes"):
                observations[standard_key] = "Yes"
            elif str(val).strip().lower() in ("false", "no"):
                observations[standard_key] = "No"
            else:
                observations[standard_key] = str(val)

    return observations if observations else None


def parse_optional_symptoms():
    """
    Parse optional 6-question farmer symptom checklist from request JSON or form.
    Canonical fields:
      - milk_has_clots (0.20)
      - milk_color_changed (0.15)
      - udder_feels_warm (0.15)
      - udder_swollen (0.20)
      - milk_yield_dropped (0.15)
      - cow_uneasy_during_milking (0.15)
    """
    raw_data = {}
    raw_json = (
        request.form.get("symptoms")
        or request.form.get("symptom_checklist")
        or request.form.get("symptom_assessment")
    )
    if raw_json:
        try:
            raw_data = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
        except Exception:
            pass

    if request.is_json and request.json:
        if "symptoms" in request.json and isinstance(request.json["symptoms"], dict):
            raw_data.update(request.json["symptoms"])
        elif "symptom_checklist" in request.json and isinstance(request.json["symptom_checklist"], dict):
            raw_data.update(request.json["symptom_checklist"])

    symptom_keys = [
        "milk_has_clots", "milk_color_changed", "udder_feels_warm",
        "udder_swollen", "milk_yield_dropped", "cow_uneasy_during_milking"
    ]
    for field in symptom_keys:
        camel_field = "".join(w.capitalize() if i > 0 else w for i, w in enumerate(field.split("_")))
        if field in request.form and field not in raw_data:
            raw_data[field] = request.form[field]
        elif camel_field in request.form and field not in raw_data:
            raw_data[field] = request.form[camel_field]
        elif request.is_json and request.json and field in request.json and field not in raw_data:
            raw_data[field] = request.json[field]

    return raw_data if raw_data else None


def generate_gradcam_async(image_array, cropped_image, original_image, heatmap_id, roi_meta=None):
    """
    Generate Grad-CAM heatmap asynchronously on the cropped udder ROI
    and persist all 4 image evidence representations:
    - <id>_orig.png: Full original photograph (Panel A)
    - <id>_crop.png: Farmer-selected udder ROI (Panel B)
    - <id>_heat.png: Jet colormap heatmap (Panel C)
    - <id>.png: Grad-CAM heatmap overlay onto cropped ROI (Panel D)
    """
    if gradcam_explainer is None:
        return

    out_overlay = HEATMAP_DIR / f"{heatmap_id}.png"
    out_orig = HEATMAP_DIR / f"{heatmap_id}_orig.png"
    out_crop = HEATMAP_DIR / f"{heatmap_id}_crop.png"
    out_heat = HEATMAP_DIR / f"{heatmap_id}_heat.png"
    out_meta = HEATMAP_DIR / f"{heatmap_id}_meta.json"
    try:
        heatmap, cam_meta = gradcam_explainer.generate_gradcam(image_array, class_idx=1, return_metadata=True)
        overlay = gradcam_explainer.overlay_gradcam(cropped_image, heatmap)

        # 1. Save overlay PNG (Panel D) - overlay is RGB, convert to BGR for cv2.imwrite
        cv2.imwrite(str(out_overlay), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        # 2. Save cropped udder ROI PNG (Panel B)
        cv2.imwrite(str(out_crop), cv2.cvtColor(cropped_image, cv2.COLOR_RGB2BGR))
        # 3. Save original full image PNG (Panel A)
        cv2.imwrite(str(out_orig), cv2.cvtColor(original_image, cv2.COLOR_RGB2BGR))
        # 4. Save Jet colormap heatmap PNG (Panel C)
        colored_heat = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
        colored_heat = cv2.resize(colored_heat, (cropped_image.shape[1], cropped_image.shape[0]))
        cv2.imwrite(str(out_heat), colored_heat)

        # 5. Persist metadata for frontend / report retrieval
        meta_payload = {
            "heatmap_id": heatmap_id,
            "low_signal": bool(cam_meta.get("low_signal", False)),
            "grad_norm": float(cam_meta.get("grad_norm", 0.0)),
            "raw_max": float(cam_meta.get("raw_max", 0.0)),
            "raw_min": float(cam_meta.get("raw_min", 0.0)),
            "gradcam_reliability": str(cam_meta.get("gradcam_reliability", "high")),
            "center_attention_pct": float(cam_meta.get("center_attention_pct", 100.0)),
            "peak_on_center": bool(cam_meta.get("peak_on_center", True)),
            "reliability_note": cam_meta.get("reliability_note"),
            "roi_applied": bool(roi_meta.get("roi_applied", False)) if roi_meta else False,
        }
        with open(out_meta, "w") as f:
            json.dump(meta_payload, f, indent=2)

        print(f"[Grad-CAM] Saved 4-panel image set (orig, crop, heat, overlay) + meta to {HEATMAP_DIR} for {heatmap_id} (low_signal={meta_payload['low_signal']}, reliability={meta_payload['gradcam_reliability']})")
    except Exception as e:
        print(f"[Grad-CAM] Generation error: {e}")


# ============= API ENDPOINTS =============

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify(format_api_response(
        True,
        "CattleSense Mastitis Detection API is running",
        data={
            'status': 'healthy',
            'version': config.API_VERSION,
            'port': config.PORT,
            'models_ready': {
                'model_1_cnn': pipeline.fusion_model.is_image_model_ready,
                'model_2_pipeline': pipeline.fusion_model.is_numerical_model_ready,
            }
        }
    ))


@app.route('/api/info', methods=['GET'])
def api_info():
    """Get API schema and feature information."""
    return jsonify(format_api_response(
        True,
        "API information",
        data={
            'title': config.API_TITLE,
            'version': config.API_VERSION,
            'image_model': 'ResNet50 (Stage 1, frozen backbone)',
            'numerical_model': 'Decision Tree Classifier (Model 2)',
            'features_required': config.REQUIRED_FEATURES,
            'clinical_observation_fields': config.CLINICAL_OBSERVATION_FIELDS,
            'port': config.PORT,
        }
    ))


@app.route('/predict', methods=['POST'])
@app.route('/api/predict/numerical', methods=['POST'])
def predict_numerical_direct():
    """
    Direct Mastitis Prediction Endpoint using the Decision Tree Classifier (Model 2).
    Strictly requires all 5 inputs:
      1. Milk_Temperature (float, milk temperature in °C)
      2. Milk_pH (float)
      3. Milk_Conductivity (float, mS/cm)
      4. Milk_Yield (float, L/day)
      5. Clotting (int: 0 = No, 1 = Yes)

    Rejects missing values with a 400 Bad Request error.
    Returns:
      - predicted_class ("Normal" / "Mastitis")
      - normal_probability (float)
      - mastitis_probability (float)
      - confidence (float)
      - disease ("mastitis")
      - stage
      - advice
    """
    try:
        features = parse_numerical_features(require_all=True)
    except ValueError as val_err:
        return jsonify(format_api_response(
            False,
            f"Validation failed: {str(val_err)}",
            error=str(val_err)
        )), 400
    except Exception as exc:
        return jsonify(format_api_response(
            False,
            f"Failed to parse payload: {str(exc)}",
            error=str(exc)
        )), 400

    if not features:
        return jsonify(format_api_response(
            False,
            "Missing required features. Exactly 5 features are required: Milk_Temperature, Milk_pH, Milk_Conductivity, Milk_Yield, Clotting.",
            error="No features provided"
        )), 400

    try:
        result = pipeline.predict_numerical(features)

        # Classify severity guidance based on result (Path A: full 5 biomarkers provided)
        severity_payload = severity_engine.classify_severity(
            prediction_label=result["label"],
            prediction_confidence=result["confidence"],
            health_metrics={
                "temperature": features.get("Milk_Temperature"),
                "conductivity": features.get("Milk_Conductivity")
            },
            symptoms_dict=None,
            model_2_used=True
        )

        response_data = {
            "disease": "mastitis",
            "prediction": result["predicted_class"],
            "predicted_class": result["predicted_class"],
            "confidence": result["confidence"],
            "confidence_score": result["confidence"],
            "normal_probability": result["normal_probability"],
            "mastitis_probability": result["mastitis_probability"],
            "uncertainty_level": result.get("uncertainty_level", "high_confidence"),
            "is_borderline": result.get("is_borderline", False),
            "uncertainty_note": result.get("uncertainty_note"),
            "active_threshold": result.get("active_threshold", 0.50),
            "threshold_distance": result.get("threshold_distance"),
            "stage": severity_payload.get("severity_label", "Normal"),
            "risk_level": severity_payload.get("severity_level", "low"),
            "advice": severity_payload.get("recommendation", ""),
            "recommendation": severity_payload.get("recommendation", ""),
            "severity": severity_payload,
            "features_submitted": features,
        }

        return jsonify(format_api_response(
            True,
            "Prediction completed successfully",
            data=response_data
        )), 200
    except Exception as exc:
        return jsonify(format_api_response(
            False,
            f"Prediction failed: {str(exc)}",
            error=str(exc)
        )), 500


@app.route('/api/predict/assisted', methods=['POST'])
def predict_assisted():
    """
    Main Mastitis Prediction Endpoint supporting:
      1. Hybrid Analysis (Udder photograph + all 5 Model 2 numerical features)
      2. Model 1-Only Fallback (Udder photograph with missing/invalid Model 2 features)
      3. Model 2-Only Analysis (All 5 numerical features without photograph)

    Required for Model 2:
      - Milk_Temperature (float: milk temperature in °C)
      - Milk_pH (float)
      - Milk_Conductivity (float: mS/cm)
      - Milk_Yield (float: L/day)
      - Clotting (int: 0 or 1)
    Optional:
      - image / file: Uploaded udder photo
      - original_image / raw_image: Original photo (for Grad-CAM comparison)
      - roi_coordinates: Cropping coordinates
      - clinical_observations: Farmer questionnaire answers
    """
    # 1. Check if image is provided
    has_image = ('image' in request.files or 'file' in request.files)
    image_file = request.files.get('image') or request.files.get('file') if has_image else None

    preprocessed_img = None
    crop_rgb = None
    orig_rgb = None
    roi_meta = {"roi_applied": False, "image_source": "none", "roi_coordinates": None}

    if image_file and image_file.filename != '':
        original_file = request.files.get('original_image') or request.files.get('raw_image')
        roi_dict = parse_roi_payload()
        try:
            preprocessed_img, crop_rgb, orig_rgb, roi_meta = load_uploaded_image_with_roi(
                image_file, original_file, roi_dict
            )
        except Exception as e:
            return jsonify(format_api_response(
                False,
                f"Error processing udder photograph: {str(e)}",
                error=str(e)
            )), 400

    # 2. Enforce mandatory image requirement for assisted prediction
    if preprocessed_img is None:
        return jsonify(format_api_response(
            False,
            "No image provided. An udder photograph is required for assisted diagnosis.",
            error="No image provided"
        )), 400

    # 2b. Anatomical Relevance Verification: Ensure photo depicts cow udder or teats
    img_to_check = orig_rgb if orig_rgb is not None else crop_rgb
    is_valid_udder, udder_msg, udder_details = udder_validator.validate(img_to_check)
    if not is_valid_udder:
        return jsonify(format_api_response(
            False,
            udder_msg,
            error=udder_msg,
            data={
                "is_valid_udder": False,
                "validation_error": udder_msg,
                "details": udder_details,
            }
        )), 400

    # 3. Parse numerical features (optional for Model 2 hybrid fusion)
    numerical_features, validation_warnings = parse_numerical_features(require_all=False, return_warnings=True)

    # 4. Parse optional clinical observations (questionnaire)
    try:
        clinical_observations = parse_optional_clinical_observations()
    except Exception as e:
        return jsonify(format_api_response(
            False,
            f"Invalid clinical observations: {str(e)}",
            error=str(e)
        )), 400

    # 5. Parse optional symptom checklist
    symptoms = parse_optional_symptoms()
    _, _, has_symptoms_answered = evaluate_symptoms(symptoms)

    # 6. Validate Path B mandatory symptom requirement for /api/predict/assisted
    # If full 5 biomarkers are not provided (Path A cannot run) AND no symptom questions were answered:
    if request.path == '/api/predict/assisted' and numerical_features is None and not has_symptoms_answered:
        return jsonify(format_api_response(
            False,
            "Please answer at least the symptom checklist questions, or provide the 5 numerical biomarker values, so we can assess disease severity accurately.",
            error="Missing required clinical symptoms or biomarkers"
        )), 400

    # 7. Run prediction through pipeline
    try:
        result = pipeline.predict_assisted(
            image_array=preprocessed_img,
            numerical_measurements=numerical_features,
            clinical_observations=clinical_observations,
            symptoms=symptoms
        )

        overall_label = result.get('overall_label')
        overall_confidence = result.get('confidence')

        model_2_used = bool(result.get('model_2_used', False))

        # Extract temperature and conductivity for clinical severity calculation
        temp_val = None
        if numerical_features and "Milk_Temperature" in numerical_features:
            temp_val = numerical_features["Milk_Temperature"]
        elif clinical_observations and "body_temperature" in clinical_observations:
            temp_val = clinical_observations["body_temperature"]

        cond_val = None
        if numerical_features and "Milk_Conductivity" in numerical_features:
            cond_val = numerical_features["Milk_Conductivity"]

        health_metrics = {}
        if temp_val is not None:
            health_metrics["temperature"] = temp_val
        if cond_val is not None:
            health_metrics["conductivity"] = cond_val

        # Generate severity guidance (Path A if Model 2 ran with 5 biomarkers, else Path B)
        if overall_label is not None and overall_confidence is not None:
            severity_payload = severity_engine.classify_severity(
                prediction_label=overall_label,
                prediction_confidence=overall_confidence,
                health_metrics=health_metrics,
                symptoms_dict=symptoms,
                model_2_used=model_2_used,
                conductivity_value=cond_val
            )
            recommendation = severity_payload.get('recommendation', '')
            stage = severity_payload.get('severity_label', 'Normal')
        else:
            stage = "Normal"
            recommendation = "No signs of mastitis detected. Continue routine milking hygiene."
            severity_payload = {
                'severity_level': 'negative',
                'severity_label': 'Normal',
                'recommendation': recommendation,
                'action': 'Routine Prevention',
                'path_used': 'path_a' if model_2_used else 'path_b'
            }

        # 5. Grad-CAM execution if image provided
        heatmap_id = None
        if preprocessed_img is not None and gradcam_explainer is not None:
            heatmap_id = str(uuid.uuid4())
            threading.Thread(
                target=generate_gradcam_async,
                args=(preprocessed_img, crop_rgb, orig_rgb, heatmap_id, roi_meta),
                daemon=True
            ).start()

        response_data = {
            'disease': 'mastitis',
            'prediction': result['prediction'],
            'predicted_class': result['predicted_class'],
            'confidence': overall_confidence,
            'confidence_score': overall_confidence,
            'normal_probability': result['normal_probability'],
            'mastitis_probability': result['mastitis_probability'],
            'uncertainty_level': result.get('uncertainty_level', 'high_confidence'),
            'is_borderline': result.get('is_borderline', False),
            'uncertainty_note': result.get('uncertainty_note'),
            'active_threshold': result.get('active_threshold'),
            'threshold_distance': result.get('threshold_distance'),
            'validation_warnings': validation_warnings if validation_warnings else None,
            'stage': stage,
            'risk_level': severity_payload.get('severity_level', 'low'),
            'advice': recommendation,
            'recommendation': recommendation,
            'severity': severity_payload,
            'clinical_rationale': severity_payload.get('clinical_rationale'),
            'clinical_rationale_si': severity_payload.get('clinical_rationale_si'),
            'roi_applied': roi_meta['roi_applied'],
            'image_source': roi_meta['image_source'],
            'roi_coordinates': roi_meta['roi_coordinates'],
            'model_2_used': model_2_used,
            'numerical_analysis_available': model_2_used,
            'image_prediction': result['image_prediction'],
            'numerical_prediction': result['numerical_prediction'],
            'health_prediction': result.get('health_prediction'),
            'numerical_measurements': numerical_features if model_2_used else None,
            'numerical_model_status': 'used' if model_2_used else 'not_available',
            'clinical_observations': clinical_observations,
            'symptom_assessment': result.get('symptom_assessment'),
            'sources_used': result['sources_used'],
            'mode': result['mode'],
        }

        if heatmap_id:
            response_data['heatmap_id'] = heatmap_id

        return jsonify(format_api_response(
            True,
            "Mastitis detection completed successfully",
            data=response_data
        )), 200
    except Exception as e:
        return jsonify(format_api_response(
            False,
            f"Prediction failed: {str(e)}",
            error=str(e)
        )), 500


@app.route('/api/predict/image', methods=['POST'])
def predict_image_only():
    """Fallback predict from uploaded image or assisted."""
    return predict_assisted()


@app.route('/api/heatmap/<heatmap_id>', methods=['GET'])
def get_heatmap(heatmap_id):
    """Serve generated Grad-CAM overlay PNG when available."""
    try:
        path = HEATMAP_DIR / f"{heatmap_id}.png"
        if path.exists():
            return send_file(str(path), mimetype='image/png')
        return jsonify(format_api_response(False, "Heatmap not ready", error="Not ready")), 202
    except Exception as e:
        return jsonify(format_api_response(False, "Failed to retrieve heatmap", error=str(e))), 500


@app.route('/api/heatmap/<heatmap_id>/meta', methods=['GET'])
def get_heatmap_meta(heatmap_id):
    """Serve Grad-CAM explanation metadata including low_signal flag."""
    try:
        meta_path = HEATMAP_DIR / f"{heatmap_id}_meta.json"
        if meta_path.exists():
            with open(meta_path, 'r') as f:
                meta_data = json.load(f)
            return jsonify(format_api_response(True, "Heatmap metadata retrieved", data=meta_data)), 200
        return jsonify(format_api_response(False, "Heatmap metadata not ready", error="Not ready")), 202
    except Exception as e:
        return jsonify(format_api_response(False, "Failed to retrieve heatmap metadata", error=str(e))), 500


@app.route('/api/report/generate-pdf', methods=['POST'])
@app.route('/api/report/pdf', methods=['POST'])
def generate_report_pdf():
    """Generate and stream a professional Veterinary Assessment Report PDF in English or Sinhala."""
    try:
        payload = request.get_json(silent=True) or {}
        result = payload.get("result") or payload.get("prediction_result") or {}
        cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
        farmer_info = payload.get("farmer_info") or payload.get("user") or {}
        health_history = payload.get("health_history") or payload.get("health_trend") or {}
        language = str(payload.get("language", "en")).lower()
        if language not in ("en", "si"):
            language = "en"

        heatmap_id = payload.get("heatmap_id") or result.get("heatmap_id")
        report_id = payload.get("report_id")

        orig_path = HEATMAP_DIR / f"{heatmap_id}_orig.png" if heatmap_id else None
        crop_path = HEATMAP_DIR / f"{heatmap_id}_crop.png" if heatmap_id else None
        heat_path = HEATMAP_DIR / f"{heatmap_id}_heat.png" if heatmap_id else None
        over_path = HEATMAP_DIR / f"{heatmap_id}.png" if heatmap_id else None

        pdf_bytes = report_generator.generate_pdf(
            prediction_result=result,
            cattle_info=cattle_info,
            farmer_info=farmer_info,
            health_history=health_history,
            original_image_path=str(orig_path) if orig_path and orig_path.exists() else None,
            cropped_image_path=str(crop_path) if crop_path and crop_path.exists() else None,
            heatmap_image_path=str(heat_path) if heat_path and heat_path.exists() else None,
            overlay_image_path=str(over_path) if over_path and over_path.exists() else None,
            report_id=report_id,
            language=language,
        )

        cow_tag = cattle_info.get("tag_id") or cattle_info.get("name") or "Cow"
        download_name = f"CattleSense-Mastitis-Report-{cow_tag}-{language}-{datetime.now().strftime('%Y%m%d%H%M')}.pdf"

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name,
        )
    except Exception as e:
        return jsonify(format_api_response(False, "Failed to generate PDF report", error=str(e))), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify(format_api_response(False, "Endpoint not found", error="404 Not Found")), 404


@app.errorhandler(413)
def request_entity_too_large(error):
    max_mb = config.MAX_UPLOAD_SIZE // (1024 * 1024)
    return jsonify(format_api_response(
        False,
        f"File size exceeds maximum allowed limit ({max_mb}MB)",
        error=f"Payload too large. Maximum file upload size is {max_mb}MB."
    )), 413


@app.errorhandler(500)
def server_error(error):
    return jsonify(format_api_response(False, "Internal server error", error="500 Server Error")), 500


if __name__ == '__main__':
    print(f"\n{'='*70}")
    print(f"CATTLESENSE MASTITIS DETECTION API")
    print(f"{'='*70}")
    print(f"Starting server on http://0.0.0.0:{config.PORT}")
    print(f"API Info: http://localhost:{config.PORT}/api/info")
    print(f"{'='*70}\n")
    app.run(debug=config.DEBUG, host='0.0.0.0', port=config.PORT)
