"""
Flask REST API for CattleSense Mastitis Detection Module.
Provides endpoints for image-based CNN prediction (Model 1),
numerical MLP prediction (Model 2), multimodal fusion, and Grad-CAM visualization.
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
from tensorflow.keras.applications.resnet import preprocess_input

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.config import (
    Config,
    get_config,
    validate_numerical_measurements,
    format_api_response,
)
from inference.prediction_pipeline import PredictionPipeline
from utils.gradcam_explainer import GradCAMExplainer
from utils.severity_engine import MastitisSeverityEngine
from utils.report_generator import VeterinaryReportGenerator
from datetime import datetime
import io

app = Flask(__name__)
config = get_config()

if config.ENABLE_CORS:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['MAX_CONTENT_LENGTH'] = config.MAX_UPLOAD_SIZE

# Upload and heatmap directories
config.UPLOAD_DIR.mkdir(exist_ok=True)
HEATMAP_DIR = config.UPLOAD_DIR / "heatmaps"
HEATMAP_DIR.mkdir(exist_ok=True)

# Initialize pipeline, Grad-CAM, severity engine, and report generator
pipeline = PredictionPipeline()
gradcam_explainer = None
severity_engine = MastitisSeverityEngine()
report_generator = VeterinaryReportGenerator()

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

        resized_crop_rgb = cv2.resize(crop_rgb, config.IMAGE_SIZE)
        preprocessed_crop = preprocess_input(resized_crop_rgb.astype(np.float32).copy())

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


def parse_optional_numerical_measurements():
    """
    Parse optional numerical measurements provided by the farmer.
    Features:
      1. Milk Temperature (°C)
      2. Milk pH
      3. Milk Conductivity (mS/cm)
      4. Somatic Cell Count (SCC)
      5. Milk Yield (L)
      6. Clotting (0 = No, 1 = Yes)

    Returns (numerical_vector, measurements_dict) or (None, None).
    Does NOT insert fake defaults or median values.
    """
    # 1. Check for JSON payload under 'numerical_measurements' or legacy 'health_inputs' / 'health'
    raw_json = (
        request.form.get("numerical_measurements")
        or request.form.get("health_inputs")
        or request.form.get("health")
    )
    raw_data = {}
    if raw_json:
        try:
            raw_data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise ValueError("numerical_measurements must be valid JSON") from exc

    # Also allow individual form fields
    for field in [
        'milk_temperature', 'milkTemperature',
        'milk_ph', 'milkPH', 'milk_pH',
        'milk_conductivity', 'milkConductivity',
        'somatic_cell_count', 'somaticCellCount',
        'milk_yield', 'milkYield',
        'clotting', 'Clotting'
    ]:
        if field in request.form and field not in raw_data:
            raw_data[field] = request.form[field]

    if not raw_data:
        return None, None

    # Map possible field variations to the canonical 6 features
    temp_val = raw_data.get('milk_temperature', raw_data.get('milkTemperature', raw_data.get('Milk_Temperature')))
    ph_val = raw_data.get('milk_ph', raw_data.get('milkPH', raw_data.get('milk_pH', raw_data.get('Milk_pH'))))
    cond_val = raw_data.get('milk_conductivity', raw_data.get('milkConductivity', raw_data.get('Milk_Conductivity')))
    scc_val = raw_data.get('somatic_cell_count', raw_data.get('somaticCellCount', raw_data.get('Somatic_Cell_Count')))
    yield_val = raw_data.get('milk_yield', raw_data.get('milkYield', raw_data.get('Milk_Yield')))
    clot_val = raw_data.get('clotting', raw_data.get('Clotting'))

    values_dict = {
        'milk_temperature': temp_val,
        'milk_ph': ph_val,
        'milk_conductivity': cond_val,
        'somatic_cell_count': scc_val,
        'milk_yield': yield_val,
        'clotting': clot_val,
    }

    # If all fields are empty/None, no numerical measurements were provided
    has_any_value = any(v not in (None, "", "null") for v in values_dict.values())
    if not has_any_value:
        return None, None

    # Parse and validate clotting if present
    parsed_clotting = None
    if clot_val not in (None, "", "null"):
        if isinstance(clot_val, str):
            norm = clot_val.strip().lower()
            if norm in {'yes', 'y', '1', 'true'}:
                parsed_clotting = 1.0
            elif norm in {'no', 'n', '0', 'false'}:
                parsed_clotting = 0.0
            else:
                raise ValueError("Clotting must be 'Yes' or 'No'")
        else:
            parsed_clotting = 1.0 if bool(clot_val) else 0.0

    # Build clean measurements dictionary
    clean_dict = {
        'milk_temperature': float(temp_val) if temp_val not in (None, "", "null") else None,
        'milk_ph': float(ph_val) if ph_val not in (None, "", "null") else None,
        'milk_conductivity': float(cond_val) if cond_val not in (None, "", "null") else None,
        'somatic_cell_count': float(scc_val) if scc_val not in (None, "", "null") else None,
        'milk_yield': float(yield_val) if yield_val not in (None, "", "null") else None,
        'clotting': ("Yes" if parsed_clotting == 1.0 else "No") if parsed_clotting is not None else None,
    }

    # Build 6-element vector for Model 2 (contains float values and None for missing features)
    vector = [
        clean_dict['milk_temperature'],
        clean_dict['milk_ph'],
        clean_dict['milk_conductivity'],
        clean_dict['somatic_cell_count'],
        clean_dict['milk_yield'],
        parsed_clotting,
    ]
    is_valid, msg = validate_numerical_measurements(vector)
    if not is_valid:
        raise ValueError(msg)

    return vector, clean_dict


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

    # Also check individual form fields
    for field in Config.CLINICAL_OBSERVATION_FIELDS:
        camel_field = "".join(w.capitalize() if i > 0 else w for i, w in enumerate(field.split("_")))
        if field in request.form and field not in raw_data:
            raw_data[field] = request.form[field]
        elif camel_field in request.form and field not in raw_data:
            raw_data[field] = request.form[camel_field]

    if not raw_data:
        return None

    observations = {}
    field_mappings = {
        'milk_yield_change': ['milk_yield_change', 'milkYieldChange'],
        'milk_appearance': ['milk_appearance', 'milkAppearance'],
        'udder_swelling': ['udder_swelling', 'udderSwelling', 'swollen_udder', 'swollenUdder'],
        'udder_warmth': ['udder_warmth', 'udderWarmth'],
        'udder_pain': ['udder_pain', 'udderPain', 'warm_or_painful_udder', 'warmOrPainfulUdder'],
        'body_temperature': ['body_temperature', 'bodyTemperature'],
        'appetite': ['appetite', 'reduced_appetite', 'reducedAppetite'],
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
            else:
                observations[standard_key] = str(val)

    return observations if observations else None


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
    try:
        heatmap = gradcam_explainer.generate_gradcam(image_array, class_idx=1)
        overlay = gradcam_explainer.overlay_gradcam(cropped_image, heatmap)

        # 1. Save overlay PNG (Panel D)
        cv2.imwrite(str(out_overlay), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        # 2. Save cropped udder ROI PNG (Panel B)
        cv2.imwrite(str(out_crop), cv2.cvtColor(cropped_image, cv2.COLOR_RGB2BGR))
        # 3. Save original full image PNG (Panel A)
        cv2.imwrite(str(out_orig), cv2.cvtColor(original_image, cv2.COLOR_RGB2BGR))
        # 4. Save Jet colormap heatmap PNG (Panel C)
        colored_heat = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
        colored_heat = cv2.resize(colored_heat, (cropped_image.shape[1], cropped_image.shape[0]))
        cv2.imwrite(str(out_heat), colored_heat)
        print(f"[Grad-CAM] Saved 4-panel image set (orig, crop, heat, overlay) to {HEATMAP_DIR} for {heatmap_id}")
    except Exception as e:
        print(f"[Grad-CAM] Generation error: {e}")


# ============= API ENDPOINTS =============

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
                'model_2_mlp': pipeline.fusion_model.is_numerical_model_ready,
                'model_2_missing_aware': pipeline.fusion_model.is_missing_aware_model_ready,
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
            'image_required': True,
            'image_model': 'ResNet-50 CNN (Model 1)',
            'numerical_model': 'MLP Neural Network (Model 2)',
            'numerical_features': config.NUMERICAL_FEATURE_NAMES,
            'clinical_observation_fields': config.CLINICAL_OBSERVATION_FIELDS,
            'port': config.PORT,
        }
    ))


@app.route('/api/predict/assisted', methods=['POST'])
def predict_assisted():
    """
    Main Mastitis Prediction Endpoint.
    Required:
      - image: Uploaded udder image file (either farmer-selected ROI crop or full photo)
    Optional:
      - original_image: Full original photograph (for comparison/reporting)
      - roi / roi_coordinates: JSON string with { x, y, width, height }
      - numerical_measurements: JSON or individual fields (6 CSV features)
      - clinical_observations: JSON or individual fields (7 clinical questionnaire questions)
    """
    # 1. Validate required image
    if 'image' not in request.files and 'file' not in request.files:
        return jsonify(format_api_response(
            False,
            "Missing required field: image. Udder photograph is required.",
            error="No image provided"
        )), 400

    image_file = request.files.get('image') or request.files.get('file')
    if not image_file or image_file.filename == '':
        return jsonify(format_api_response(
            False,
            "Missing required field: image. Udder photograph is required.",
            error="No image selected"
        )), 400

    original_file = request.files.get('original_image') or request.files.get('raw_image')
    roi_dict = parse_roi_payload()

    # 2. Process image with farmer-guided ROI
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

    # 3. Parse optional numerical measurements
    try:
        numerical_vector, numerical_dict = parse_optional_numerical_measurements()
    except Exception as e:
        return jsonify(format_api_response(
            False,
            f"Invalid numerical measurements: {str(e)}",
            error=str(e)
        )), 400

    # 4. Parse optional clinical observations (questionnaire)
    try:
        clinical_observations = parse_optional_clinical_observations()
    except Exception as e:
        return jsonify(format_api_response(
            False,
            f"Invalid clinical observations: {str(e)}",
            error=str(e)
        )), 400

    # 5. Run prediction through pipeline
    try:
        result = pipeline.predict_assisted(
            image_array=preprocessed_img,
            numerical_measurements=numerical_vector,
            clinical_observations=clinical_observations
        )

        overall_label = result.get('overall_label')
        overall_confidence = result.get('confidence')

        # Generate severity guidance
        if overall_label is not None and overall_confidence is not None:
            severity_payload = severity_engine.classify_severity(
                overall_label,
                overall_confidence,
                numerical_dict or {}
            )
            recommendation = severity_payload.get('recommendation', '')
            stage = severity_payload.get('severity_label', 'Normal')
        else:
            stage = "Pending Model Training"
            recommendation = "Models are scheduled for training. Udder image and optional clinical data successfully ingested."
            severity_payload = {
                'severity_level': 'pending',
                'severity_label': 'Pending Model Training',
                'recommendation': recommendation,
                'action': 'none'
            }

        # 6. Grad-CAM execution (on the exact cropped udder input passed to Model 1)
        heatmap_id = None
        if gradcam_explainer is not None:
            heatmap_id = str(uuid.uuid4())
            threading.Thread(
                target=generate_gradcam_async,
                args=(preprocessed_img, crop_rgb, orig_rgb, heatmap_id, roi_meta),
                daemon=True
            ).start()

        response_data = {
            'prediction': result['prediction'],
            'confidence': overall_confidence,
            'stage': stage,
            'recommendation': recommendation,
            'severity': severity_payload,
            'roi_applied': roi_meta['roi_applied'],
            'image_source': roi_meta['image_source'],
            'roi_coordinates': roi_meta['roi_coordinates'],
            'model_2_used': result.get('model_2_used', False),
            'numerical_analysis_available': result.get('numerical_analysis_available', result.get('model_2_used', False)),
            'numerical_model_type': result.get('numerical_model_type', 'unavailable'),
            'missing_numerical_features': result.get('missing_numerical_features', []),
            'image_prediction': result['image_prediction'],
            'numerical_prediction': result['numerical_prediction'],
            'health_prediction': result.get('health_prediction'),
            'numerical_measurements': numerical_dict,
            'numerical_model_status': result.get('numerical_model_status', 'not_available'),
            'clinical_observations': clinical_observations,
            'sources_used': result['sources_used'],
            'mode': result['mode'],
        }

        if heatmap_id:
            response_data['heatmap_id'] = heatmap_id

        return jsonify(format_api_response(
            True,
            "Mastitis detection completed successfully",
            data=response_data
        ))
    except Exception as e:
        return jsonify(format_api_response(
            False,
            f"Prediction failed: {str(e)}",
            error=str(e)
        )), 500


@app.route('/api/predict/image', methods=['POST'])
def predict_image_only():
    """Predict mastitis from an uploaded image using Model 1 only."""
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


@app.route('/api/report/generate-pdf', methods=['POST'])
def generate_report_pdf():
    """Generate and stream a professional Veterinary Assessment Report PDF."""
    try:
        payload = request.get_json(silent=True) or {}
        result = payload.get("result") or payload.get("prediction_result") or {}
        cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
        farmer_info = payload.get("farmer_info") or payload.get("user") or {}
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
            original_image_path=str(orig_path) if orig_path and orig_path.exists() else None,
            cropped_image_path=str(crop_path) if crop_path and crop_path.exists() else None,
            heatmap_image_path=str(heat_path) if heat_path and heat_path.exists() else None,
            overlay_image_path=str(over_path) if over_path and over_path.exists() else None,
            report_id=report_id,
        )

        cow_tag = cattle_info.get("tag_id") or cattle_info.get("name") or "Cow"
        download_name = f"CattleSense-Mastitis-Report-{cow_tag}-{datetime.now().strftime('%Y%m%d%H%M')}.pdf"

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
