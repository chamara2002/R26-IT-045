"""
gradcam_explainer.py — CattleSense Model 1 Grad-CAM Explainability Module
Generated as part of final-year research: ML-Based Early Detection of Cattle Diseases

Usage:
    from gradcam_explainer import predict_mastitis, generate_gradcam
    result = predict_mastitis("path/to/image.jpg")
    heatmap, overlay, prob = generate_gradcam("path/to/image.jpg")
"""

import os
from pathlib import Path
import json
import numpy as np
from PIL import Image
import matplotlib
import matplotlib.cm as cm
import tensorflow as tf

_CURRENT_DIR = Path(__file__).resolve().parent
MODEL_PATH = _CURRENT_DIR / "mastitis_image_model.keras"
THRESHOLD_PATH = _CURRENT_DIR / "threshold.json"
CLASS_NAMES_PATH = _CURRENT_DIR / "class_names.json"
CONV_LAYER_NAME = "block_13_expand_relu"  # finalized after resolution comparison
BACKBONE_LAYER_NAME = "mobilenetv2_1.00_224"

_model = None
_threshold = 0.50
_class_names = {"0": "normal", "1": "mastitis"}


def _get_jet_colormap():
    """Retrieve jet colormap safely across matplotlib versions."""
    try:
        return matplotlib.colormaps["jet"]
    except Exception:
        try:
            return cm.get_cmap("jet")
        except Exception:
            import matplotlib.pyplot as plt
            return plt.get_cmap("jet")


def _load_resources():
    global _model, _threshold, _class_names
    if _model is None:
        _model = tf.keras.models.load_model(str(MODEL_PATH))
        if THRESHOLD_PATH.exists():
            with open(THRESHOLD_PATH, "r") as f:
                _threshold = json.load(f)["threshold"]
        if CLASS_NAMES_PATH.exists():
            with open(CLASS_NAMES_PATH, "r") as f:
                _class_names = json.load(f)


def _preprocess_image(image_input, target_size=(224, 224)):
    """Aspect-ratio-preserving resize + letterbox padding + MobileNetV2 normalization."""
    if isinstance(image_input, (str, Path)):
        img = Image.open(str(image_input)).convert("RGB")
    elif isinstance(image_input, np.ndarray):
        img = Image.fromarray(image_input.astype(np.uint8)).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")

    orig_w, orig_h = img.size
    target_w, target_h = target_size
    scale = min(target_w / orig_w, target_h / orig_h)
    new_w, new_h = max(1, int(orig_w * scale)), max(1, int(orig_h * scale))
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGB", target_size, (128, 128, 128))
    paste_x = (target_w - new_w) // 2
    paste_y = (target_h - new_h) // 2
    canvas.paste(img_resized, (paste_x, paste_y))

    img_array = np.array(canvas).astype(np.float32)
    return img_array


def predict_mastitis(image_input):
    """
    Returns:
        {
            "prediction": "mastitis" | "normal",
            "probability": float (raw sigmoid output, probability of mastitis),
            "confidence": float (distance from decision boundary, normalized 0-1),
            "class": int (0 or 1)
        }
    """
    _load_resources()
    img_array = _preprocess_image(image_input)
    img_preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(
        img_array[np.newaxis, ...]
    )
    prob = float(_model.predict(img_preprocessed, verbose=0)[0, 0])
    predicted_class = 1 if prob >= _threshold else 0
    confidence = abs(prob - 0.5) * 2  # 0 = uncertain, 1 = maximally confident

    return {
        "prediction": _class_names.get(str(predicted_class), "mastitis" if predicted_class == 1 else "normal"),
        "probability": prob,
        "confidence": confidence,
        "class": predicted_class
    }


def generate_gradcam(image_input):
    """
    Returns:
        heatmap: np.ndarray (224, 224), values in [0,1]
        overlay: np.ndarray (224, 224, 3), uint8 — heatmap overlaid on original image
        probability: float — model's raw predicted probability of mastitis
    """
    _load_resources()
    img_array = _preprocess_image(image_input)
    img_preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(
        img_array[np.newaxis, ...]
    )

    backbone = _model.get_layer(BACKBONE_LAYER_NAME)
    grad_model = tf.keras.models.Model(
        inputs=backbone.input,
        outputs=[backbone.get_layer(CONV_LAYER_NAME).output, backbone.output]
    )

    with tf.GradientTape() as tape:
        conv_output, backbone_features = grad_model(img_preprocessed)
        x = tf.keras.layers.GlobalAveragePooling2D()(backbone_features)
        x = _model.get_layer("dense_4")(x)
        preds = _model.get_layer("dense_5")(x)
        class_channel = preds[:, 0]

    grads = tape.gradient(class_channel, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_output = conv_output[0]
    heatmap = conv_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    heatmap = heatmap.numpy()

    heatmap_resized = tf.image.resize(heatmap[..., np.newaxis], (224, 224)).numpy().squeeze()
    heatmap_resized = heatmap_resized / (heatmap_resized.max() + 1e-8)

    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    jet = _get_jet_colormap()
    jet_colors = jet(np.arange(256))[:, :3]
    jet_heatmap = jet_colors[heatmap_uint8]
    jet_heatmap_img = tf.keras.utils.array_to_img(jet_heatmap).resize((224, 224))
    jet_heatmap_arr = tf.keras.utils.img_to_array(jet_heatmap_img)

    overlay = np.clip(jet_heatmap_arr * 0.4 + img_array, 0, 255).astype(np.uint8)
    probability = float(preds[0, 0])

    return heatmap_resized, overlay, probability
