"""
Standalone Model 1 interface and Grad-CAM functions for ResNet50.
"""
from pathlib import Path
import json
import numpy as np
import tensorflow as tf

from preprocessing.image_preprocessing import preprocess_image_for_model1
from utils.gradcam_explainer import GradCAMExplainer, compute_attention_reliability

MODEL_DIR = Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / "mastitis_image_model.keras"
THRESHOLD_PATH = MODEL_DIR / "threshold.json"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"

_model = None
_explainer = None
_threshold = None
_classes = None


def _get_model_and_explainer():
    global _model, _explainer, _threshold, _classes
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        _model = tf.keras.models.load_model(str(MODEL_PATH))
        _explainer = GradCAMExplainer(_model, layer_name="conv5_block3_out")

        _threshold = 0.25
        if THRESHOLD_PATH.exists():
            with open(THRESHOLD_PATH, "r") as f:
                t_data = json.load(f)
                _threshold = float(t_data.get("selected_threshold", t_data.get("threshold", 0.25)))

        _classes = {"0": "normal", "1": "mastitis"}
        if CLASS_NAMES_PATH.exists():
            with open(CLASS_NAMES_PATH, "r") as f:
                _classes = json.load(f)

    return _model, _explainer, _threshold, _classes


def predict_mastitis(image):
    """
    Run prediction on a single image (PIL Image, numpy ndarray RGB/BGR).
    Returns dict with 'prediction' ('normal' or 'mastitis') and 'probability'.
    """
    model, _, threshold, classes = _get_model_and_explainer()
    preprocessed_img, _ = preprocess_image_for_model1(image, target_size=(224, 224))
    img_tensor = np.expand_dims(preprocessed_img, axis=0)

    preds = model.predict(img_tensor, verbose=0)
    if preds.shape[-1] == 1:
        prob_mastitis = float(preds[0][0])
    else:
        prob_mastitis = float(preds[0][1])

    label = 1 if prob_mastitis >= threshold else 0
    pred_class = classes.get(str(label), "mastitis" if label == 1 else "normal")

    return {
        "prediction": pred_class,
        "probability": prob_mastitis,
        "label": label,
        "threshold": threshold,
    }


def generate_gradcam(image, return_metadata=False):
    """
    Generate Grad-CAM heatmap and overlay for an image.
    Returns (heatmap (224, 224), overlay (224, 224, 3) [RGB], prob_mastitis float).
    If return_metadata is True, returns (heatmap, overlay, prob_mastitis, metadata).
    """
    model, explainer, _, _ = _get_model_and_explainer()
    preprocessed_img, canvas_rgb = preprocess_image_for_model1(image, target_size=(224, 224))
    heatmap, metadata = explainer.generate_gradcam(preprocessed_img, class_idx=1, return_metadata=True)
    overlay = explainer.overlay_gradcam(canvas_rgb, heatmap)

    preds = model.predict(np.expand_dims(preprocessed_img, axis=0), verbose=0)
    prob_mastitis = float(preds[0][0]) if preds.shape[-1] == 1 else float(preds[0][1])

    if return_metadata:
        return heatmap, overlay, prob_mastitis, metadata
    return heatmap, overlay, prob_mastitis

