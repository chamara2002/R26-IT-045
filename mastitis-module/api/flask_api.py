"""
Flask REST API for Mastitis Detection
Provides endpoints for predictions and model management.
"""
import sys
from pathlib import Path
import os
import json
import base64
import io
import numpy as np
import cv2
import pandas as pd
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_file
import threading
import uuid
from flask_cors import CORS
from tensorflow.keras.applications.resnet import preprocess_input

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

MODULE_ROOT = Path(__file__).resolve().parent.parent

from inference.api_config import Config, PredictionThreshold, get_config, validate_health_metrics, format_api_response
from inference.prediction_pipeline import PredictionPipeline
from utils.gradcam_explainer import GradCAMExplainer
from utils.severity_engine import MastitisSeverityEngine

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure
config = get_config()
app.config['MAX_CONTENT_LENGTH'] = config.MAX_UPLOAD_SIZE

HEALTH_FEATURE_ORDER = [
    'Milk_Temperature',
    'Milk_pH',
    'Milk_Conductivity',
    'Somatic_Cell_Count',
    'Milk_Yield',
    'Clotting',
]


def load_health_feature_defaults(csv_path='dataset/mastitis_data.csv'):
    """Load fallback numerical defaults from the mastitis CSV."""
    csv_path = MODULE_ROOT / 'dataset' / 'mastitis_data.csv' if csv_path == 'dataset/mastitis_data.csv' else Path(csv_path)

    defaults = {
        'Milk_Temperature': 35.5,
        'Milk_pH': 6.6,
        'Milk_Conductivity': 4.8,
        'Somatic_Cell_Count': 180.0,
        'Milk_Yield': 18.0,
        'Clotting': 0.0,
    }

    try:
        df = pd.read_csv(csv_path)
        for feature in HEALTH_FEATURE_ORDER:
            if feature in df.columns:
                if feature == 'Clotting':
                    defaults[feature] = float(df[feature].mode(dropna=True).iloc[0])
                else:
                    defaults[feature] = float(df[feature].median())
    except Exception:
        pass

    return defaults


HEALTH_DEFAULTS = load_health_feature_defaults()

# Ensure upload directory exists
config.UPLOAD_DIR.mkdir(exist_ok=True)
HEATMAP_DIR = config.UPLOAD_DIR / "heatmaps"
HEATMAP_DIR.mkdir(exist_ok=True)

# Load prediction pipeline
pipeline = None
gradcam_explainer = None
severity_engine = None

try:
    pipeline = PredictionPipeline(image_weight=config.IMAGE_WEIGHT)
    print("✓ Prediction pipeline initialized")
except Exception as e:
    print(f"✗ Error initializing prediction pipeline: {e}")

if pipeline is not None:
    try:
        gradcam_explainer = GradCAMExplainer(pipeline.fusion_model.cnn_model)
        print("✓ Grad-CAM explainer initialized")
    except Exception as e:
        print(f"⚠ Grad-CAM unavailable: {e}")

    try:
        severity_engine = MastitisSeverityEngine()
        print("✓ Severity engine initialized")
    except Exception as e:
        print(f"⚠ Severity engine unavailable: {e}")


SEVERITY_PUBLIC_MAP = {
    "negative": {"stage": "Healthy", "code": 0, "display_label": "Healthy"},
    "mild": {"stage": "Mild", "code": 1, "display_label": "Stage 1: Mild"},
    "moderate": {"stage": "Moderate", "code": 2, "display_label": "Stage 2: Moderate"},
    "severe": {"stage": "Severe", "code": 3, "display_label": "Stage 3: Severe"},
}


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def load_uploaded_image(image_file):
    """Load, validate, and normalize an uploaded image file."""
    if not allowed_file(image_file.filename):
        raise ValueError(f"Invalid file format. Allowed: {config.ALLOWED_EXTENSIONS}")

    filename = f"{uuid.uuid4().hex}_{secure_filename(image_file.filename)}"
    filepath = config.UPLOAD_DIR / filename
    image_file.save(str(filepath))

    try:
        img = cv2.imread(str(filepath))
        if img is None:
            raise ValueError("Could not read image file")

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, config.IMAGE_SIZE)
        img = preprocess_input(img.astype(np.float32))
        return img
    finally:
        if filepath.exists():
            os.remove(filepath)


def parse_optional_health_metrics():
    """Parse optional farmer health inputs and expand into the 6-feature model vector."""
    raw_inputs = request.form.get("health_inputs")
    if raw_inputs:
        try:
            inputs = json.loads(raw_inputs)
        except json.JSONDecodeError as exc:
            raise ValueError("health_inputs must be valid JSON") from exc

        if not isinstance(inputs, dict):
            raise ValueError("health_inputs must be a JSON object")

        provided = {
            'milk_temperature': inputs.get('milk_temperature', inputs.get('cow_temperature')),
            'milk_yield': inputs.get('milk_yield'),
            'clotting': inputs.get('clotting'),
        }

        has_any_value = any(value not in (None, "") for value in provided.values())
        if not has_any_value:
            return None, None

        resolved = dict(HEALTH_DEFAULTS)

        if provided['milk_temperature'] not in (None, ""):
            resolved['Milk_Temperature'] = float(provided['milk_temperature'])
        if provided['milk_yield'] not in (None, ""):
            resolved['Milk_Yield'] = float(provided['milk_yield'])

        clotting_value = provided['clotting']
        if clotting_value not in (None, ""):
            if isinstance(clotting_value, str):
                normalized = clotting_value.strip().lower()
                resolved['Clotting'] = 1.0 if normalized in {'1', 'true', 'yes', 'y'} else 0.0
            else:
                resolved['Clotting'] = 1.0 if bool(clotting_value) else 0.0

        metrics = [resolved[feature] for feature in HEALTH_FEATURE_ORDER]
        valid, msg = validate_health_metrics(metrics)
        if not valid:
            raise ValueError(msg)

        summary = {
            'milk_temperature': provided['milk_temperature'],
            'milk_yield': provided['milk_yield'],
            'clotting': provided['clotting'],
        }
        severity_context = {}
        if provided['milk_temperature'] not in (None, ""):
            severity_context['body_temperature'] = float(provided['milk_temperature'])
        if provided['milk_yield'] not in (None, ""):
            severity_context['milk_yield'] = float(provided['milk_yield'])
        return metrics, summary, severity_context

    # Backward-compatible path for full 6-feature payloads.
    raw_metrics = request.form.get("health_metrics")
    if not raw_metrics:
        return None, None, None

    try:
        metrics = json.loads(raw_metrics)
    except json.JSONDecodeError as exc:
        raise ValueError("health_metrics must be valid JSON") from exc

    valid, msg = validate_health_metrics(metrics)
    if not valid:
        raise ValueError(msg)

    metrics = [float(metric) for metric in metrics]
    summary = {
        'milk_temperature': metrics[0],
        'milk_yield': metrics[4],
        'clotting': metrics[5],
    }
    severity_context = {
        'body_temperature': float(metrics[0]),
        'somatic_cell_count': float(metrics[3]),
        'milk_yield': float(metrics[4]),
    }
    return metrics, summary, severity_context


def build_public_stage(severity_level):
    """Map internal severity levels to the user-facing mastitis stage labels."""
    return SEVERITY_PUBLIC_MAP.get(severity_level, SEVERITY_PUBLIC_MAP['negative'])


def build_severity_payload(prediction_label, prediction_confidence, health_context=None):
    """Create a stable stage payload for API responses."""
    if severity_engine is None:
        public = build_public_stage('negative' if prediction_label == 0 else 'mild')
        return {
            'severity_level': 'negative' if prediction_label == 0 else 'mild',
            'severity_label': 'No Mastitis' if prediction_label == 0 else 'Mild Mastitis',
            'stage': public['stage'],
            'stage_code': public['code'],
            'display_label': public['display_label'],
            'confidence_score': float(prediction_confidence),
            'recommendation': 'Cow is healthy. Continue routine monitoring.' if prediction_label == 0 else 'Mild mastitis detected. Monitor closely and increase udder care.',
            'action': 'none' if prediction_label == 0 else 'monitor',
            'treatment_protocol': None,
        }

    severity = severity_engine.classify_severity(int(prediction_label), float(prediction_confidence), health_context or {})
    public = build_public_stage(severity['severity_level'])
    return {
        **severity,
        'stage': public['stage'],
        'stage_code': public['code'],
        'display_label': public['display_label'],
        'treatment_protocol': severity_engine.get_treatment_protocol(severity['severity_level']),
    }


def parse_optional_behavior_signals():
    """Parse optional behavior questionnaire answers from a multipart request."""
    raw_behaviors = request.form.get("behavior_signals")
    if not raw_behaviors:
        return None

    try:
        behaviors = json.loads(raw_behaviors)
    except json.JSONDecodeError as exc:
        raise ValueError("behavior_signals must be valid JSON") from exc

    if not isinstance(behaviors, dict):
        raise ValueError("behavior_signals must be a JSON object")

    return behaviors


def generate_and_save_gradcam(image_array, original_image_array, out_path):
    """Generate Grad-CAM overlay and save PNG to out_path. Returns heatmap array on success."""
    try:
        if gradcam_explainer is None:
            print("Warning: Grad-CAM explainer is None")
            return None

        print(f"[Grad-CAM] Generating heatmap for {out_path}")
        heatmap = gradcam_explainer.generate_gradcam(image_array, class_idx=1)
        print(f"[Grad-CAM] Heatmap generated, shape: {heatmap.shape}")
        
        overlay = gradcam_explainer.overlay_gradcam(original_image_array, heatmap)
        print(f"[Grad-CAM] Overlay created, shape: {overlay.shape}")
        
        # Save overlay PNG
        success = cv2.imwrite(str(out_path), overlay)
        if success:
            print(f"[Grad-CAM] Heatmap saved successfully to {out_path}")
        else:
            print(f"[Grad-CAM] ERROR: Failed to write heatmap to {out_path}")
        
        return heatmap.tolist()
    except Exception as e:
        print(f"[Grad-CAM] ERROR generating heatmap: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============= API ENDPOINTS =============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify(format_api_response(
        True,
        "API is running",
        data={'status': 'healthy', 'version': config.API_VERSION}
    ))


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Predict mastitis from image and health metrics.
    
    Request:
        - image: Image file (required)
        - health_metrics: JSON string of 6 health metrics (required)
    
    Response:
        - prediction: 'Mastitis' or 'Normal'
        - confidence: Float between 0 and 1
        - recommendation: Recommendation text
        - details: Full prediction details
    """
    if pipeline is None:
        return jsonify(format_api_response(
            False,
            "Prediction pipeline not initialized",
            error="Model loading failed"
        )), 500
    
    # Validate input
    if 'image' not in request.files:
        return jsonify(format_api_response(
            False,
            "Missing required field: image",
            error="No image provided"
        )), 400
    
    if 'health_metrics' not in request.form:
        return jsonify(format_api_response(
            False,
            "Missing required field: health_metrics",
            error="No health metrics provided"
        )), 400
    
    # Get and validate image
    try:
        img = load_uploaded_image(request.files['image'])
    except Exception as e:
        return jsonify(format_api_response(
            False,
            "Error processing image",
            error=str(e)
        )), 400
    
    # Get and validate health metrics
    try:
        health_metrics = json.loads(request.form['health_metrics'])
        valid, msg = validate_health_metrics(health_metrics)
        if not valid:
            return jsonify(format_api_response(
                False,
                "Invalid health metrics",
                error=msg
            )), 400
    except json.JSONDecodeError:
        return jsonify(format_api_response(
            False,
            "Invalid health metrics format",
            error="Must be valid JSON"
        )), 400
    
    # Make prediction
    try:
        result = pipeline.predict_from_array(img, health_metrics)
        formatted = pipeline.format_result(result)
        severity_payload = build_severity_payload(
            formatted['hybrid_prediction']['label'] if formatted.get('hybrid_prediction') else 0,
            formatted['confidence'],
            {
                'body_temperature': float(health_metrics[0]),
                'somatic_cell_count': float(health_metrics[3]),
                'milk_yield': float(health_metrics[4]),
            }
        )
        
        return jsonify(format_api_response(
            True,
            "Prediction successful",
            data={
                'prediction': formatted['prediction'],
                'confidence': float(formatted['confidence']),
                'recommendation': severity_payload['recommendation'],
                'stage': severity_payload['stage'],
                'severity': severity_payload,
                'details': {
                    'image': formatted['image_prediction'],
                    'health': formatted['health_prediction'],
                    'hybrid': formatted['hybrid_prediction']
                }
            }
        ))
    except Exception as e:
        return jsonify(format_api_response(
            False,
            "Prediction failed",
            error=str(e)
        )), 500


@app.route('/api/predict/image', methods=['POST'])
def predict_image_only():
    """Predict mastitis from an uploaded image using the CNN model only."""
    if pipeline is None:
        return jsonify(format_api_response(
            False,
            "Prediction pipeline not initialized",
            error="Model loading failed"
        )), 500

    if 'image' not in request.files:
        return jsonify(format_api_response(
            False,
            "Missing required field: image",
            error="No image provided"
        )), 400

    try:
        img = load_uploaded_image(request.files['image'])
        label, confidence, _ = pipeline.fusion_model.predict_image(img)
        severity_payload = build_severity_payload(label, confidence, None)

        return jsonify(format_api_response(
            True,
            "Image prediction successful",
            data={
                'prediction': 'Mastitis' if label == 1 else 'Normal',
                'confidence': float(confidence),
                'recommendation': severity_payload['recommendation'],
                'stage': severity_payload['stage'],
                'severity': severity_payload,
                'details': {
                    'image': {
                        'label': int(label),
                        'confidence': float(confidence),
                    }
                }
            }
        ))
    except Exception as e:
        return jsonify(format_api_response(
            False,
            "Image prediction failed",
            error=str(e)
        )), 500


@app.route('/api/predict/assisted', methods=['POST'])
def predict_assisted():
    """Predict mastitis from image plus optional numerical and behavior inputs."""
    if pipeline is None:
        return jsonify(format_api_response(
            False,
            "Prediction pipeline not initialized",
            error="Model loading failed"
        )), 500

    if 'image' not in request.files:
        return jsonify(format_api_response(
            False,
            "Missing required field: image",
            error="No image provided"
        )), 400

    try:
        # Load the original image for Grad-CAM visualization
        image_file = request.files['image']
        filename = f"{uuid.uuid4().hex}_{secure_filename(image_file.filename)}"
        filepath = config.UPLOAD_DIR / filename
        image_file.save(str(filepath))
        
        try:
            # Load original image for Grad-CAM
            original_img = cv2.imread(str(filepath))
            original_img = cv2.cvtColor(original_img, cv2.COLOR_BGR2RGB)
            original_img_resized = cv2.resize(original_img, config.IMAGE_SIZE)
            
            # Load preprocessed image for prediction
            img = preprocess_input(original_img_resized.astype(np.float32).copy())
        finally:
            if filepath.exists():
                os.remove(filepath)
        
        health_metrics, health_inputs_summary, severity_context = parse_optional_health_metrics()
        behavior_signals = parse_optional_behavior_signals()

        result = pipeline.fusion_model.predict_assisted(
            img,
            health_metrics=health_metrics,
            behavior_signals=behavior_signals,
            image_weight=config.IMAGE_WEIGHT,
        )

        overall_label = result['overall_prediction']['label']
        overall_confidence = result['overall_prediction']['confidence']

        severity_payload = build_severity_payload(overall_label, overall_confidence, severity_context)

        input_summary = {
            'health_inputs_provided': health_metrics is not None,
            'behavior_signals_provided': behavior_signals is not None,
        }

        if health_inputs_summary is not None:
            input_summary['health_inputs'] = health_inputs_summary

        if behavior_signals is not None:
            input_summary['behavior_signals'] = behavior_signals

        # Kick off asynchronous Grad-CAM generation (fast non-blocking)
        heatmap_id = None
        try:
            if gradcam_explainer is not None:
                heatmap_id = str(uuid.uuid4())
                out_path = HEATMAP_DIR / f"{heatmap_id}.png"
                print(f"[predict_assisted] Starting Grad-CAM generation for heatmap_id={heatmap_id}")

                def worker_generate():
                    try:
                        print(f"[worker_generate] Starting thread for {heatmap_id}")
                        generate_and_save_gradcam(img, original_img_resized, out_path)
                        print(f"[worker_generate] Completed for {heatmap_id}")
                    except Exception as e:
                        print(f"[worker_generate] ERROR: {e}")
                        import traceback
                        traceback.print_exc()

                thread = threading.Thread(target=worker_generate, daemon=True)
                thread.start()
            else:
                print("[predict_assisted] gradcam_explainer is None, skipping heatmap generation")
        except Exception as e:
            print(f"[predict_assisted] ERROR setting up Grad-CAM thread: {e}")
            import traceback
            traceback.print_exc()
            heatmap_id = None

        response_data = {
            'prediction': 'Mastitis' if overall_label == 1 else 'Normal',
            'confidence': float(overall_confidence),
            'recommendation': severity_payload['recommendation'],
            'stage': severity_payload['stage'],
            'severity': severity_payload,
            'image_prediction': result['image_prediction'],
            'health_prediction': result['health_prediction'],
            'behavior_assessment': result['behavior_assessment'],
            'overall_prediction': result['overall_prediction'],
            'input_summary': input_summary,
        }
        # Include heatmap_id so frontend can fetch the overlay when ready
        if heatmap_id is not None:
            response_data['heatmap_id'] = heatmap_id
            print(f"[predict_assisted] Returning response with heatmap_id={heatmap_id}")
        else:
            print(f"[predict_assisted] No heatmap_id to return (gradcam_explainer may be unavailable)")

        return jsonify(format_api_response(
            True,
            "Assisted prediction successful",
            data=response_data
        ))
    except Exception as e:
        return jsonify(format_api_response(
            False,
            "Assisted prediction failed",
            error=str(e)
        )), 400


@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction endpoint.
    
    Request:
        - predictions: List of {image_path, health_metrics} objects
    
    Response:
        - results: List of predictions
    """
    if pipeline is None:
        return jsonify(format_api_response(
            False,
            "Prediction pipeline not initialized",
            error="Model loading failed"
        )), 500
    
    try:
        data = request.get_json()
        predictions_data = data.get('predictions', [])
        
        if not predictions_data:
            return jsonify(format_api_response(
                False,
                "No predictions provided",
                error="Empty predictions list"
            )), 400
        
        results = []
        for pred_data in predictions_data:
            try:
                image_path = pred_data.get('image_path')
                health_metrics = pred_data.get('health_metrics')
                
                if not image_path or not health_metrics:
                    results.append({'success': False, 'error': 'Missing image_path or health_metrics'})
                    continue
                
                result = pipeline.predict_from_image_path(image_path, health_metrics)
                formatted = pipeline.format_result(result)
                results.append({
                    'success': True,
                    'prediction': formatted['prediction'],
                    'confidence': float(formatted['confidence'])
                })
            except Exception as e:
                results.append({'success': False, 'error': str(e)})
        
        return jsonify(format_api_response(
            True,
            "Batch prediction completed",
            data={'results': results}
        ))
    except Exception as e:
        return jsonify(format_api_response(
            False,
            "Batch prediction failed",
            error=str(e)
        )), 500


@app.route('/api/info', methods=['GET'])
def api_info():
    """Get API information."""
    return jsonify(format_api_response(
        True,
        "API information",
        data={
            'title': config.API_TITLE,
            'version': config.API_VERSION,
            'health_features': config.HEALTH_FEATURES_NAMES,
            'image_size': config.IMAGE_SIZE,
            'image_weight': config.IMAGE_WEIGHT
        }
    ))


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify(format_api_response(
        False,
        "Endpoint not found",
        error="404 Not Found"
    )), 404


@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors."""
    return jsonify(format_api_response(
        False,
        "Internal server error",
        error="500 Server Error"
    )), 500


@app.route('/api/heatmap/<heatmap_id>', methods=['GET'])
def get_heatmap(heatmap_id):
    """Serve generated Grad-CAM overlay PNG when available."""
    try:
        path = HEATMAP_DIR / f"{heatmap_id}.png"
        if path.exists():
            return send_file(str(path), mimetype='image/png')
        # Not ready yet
        return jsonify(format_api_response(False, "Heatmap not ready", error="Not ready")), 202
    except Exception as e:
        return jsonify(format_api_response(False, "Failed to retrieve heatmap", error=str(e))), 500


# ============= MAIN =============

if __name__ == '__main__':
    server_port = int(os.getenv("MASTITIS_PORT", "5002"))
    print(f"\n{'='*70}")
    print(f"MASTITIS DETECTION API - {config.API_VERSION.upper()}")
    print(f"{'='*70}")
    print(f"Starting Flask server...")
    print(f"Available at: http://localhost:{server_port}")
    print(f"API Docs: http://localhost:{server_port}/api/info")
    print(f"{'='*70}\n")
    
    app.run(debug=config.DEBUG, host='0.0.0.0', port=server_port)
