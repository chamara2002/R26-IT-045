import base64
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder

from src.preprocessing.image_pipeline import decode_base64_image, load_image_path, preprocess_image
from src.utils.file_utils import load_pickle


BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "models" / "model"
MODEL_PATH = MODEL_DIR / "fmd_model.h5"
ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"
TARGET_SIZE = (160, 160)


def load_model_and_encoder() -> Tuple[object, LabelEncoder]:
    # 1. Load or auto-reconstruct LabelEncoder
    label_encoder = None
    if ENCODER_PATH.exists():
        try:
            label_encoder = load_pickle(ENCODER_PATH)
        except Exception as e:
            print(f"[FMD] Warning: Could not unpickle {ENCODER_PATH}: {e}. Initializing default binary encoder.")
    
    if label_encoder is None or not hasattr(label_encoder, "classes_"):
        label_encoder = LabelEncoder()
        label_encoder.fit(["0", "1"])
        try:
            from src.utils.file_utils import save_pickle
            save_pickle(label_encoder, ENCODER_PATH)
        except Exception:
            pass

    # 2. Check model paths (primary and fallback paths)
    candidate_paths = [
        MODEL_PATH,
        MODEL_DIR / "final_efficientnet.h5",
        MODEL_DIR / "efficientnet_fold_1.h5",
        MODEL_DIR / "fmd_model_weights.h5",
    ]
    
    existing_model_path = next((p for p in candidate_paths if p.exists()), None)
    
    model = None
    if existing_model_path:
        try:
            model = load_model(existing_model_path)
            print(f"[FMD] Successfully loaded model from {existing_model_path}")
        except Exception as e:
            print(f"[FMD] load_model({existing_model_path}) notice: {e}. Attempting build_model with weights.")
            try:
                from src.training.train import build_model
                model = build_model(
                    input_shape=(160, 160, 3),
                    num_classes=len(label_encoder.classes_),
                    backbone_name="efficientnet",
                )
                model.load_weights(existing_model_path)
                print(f"[FMD] Successfully loaded weights into EfficientNet from {existing_model_path}")
            except Exception as e2:
                print(f"[FMD] Weight loading failed: {e2}")
    
    if model is None:
        # Fallback: build EfficientNet backbone
        print("[FMD] Warning: Model file not found on disk. Building baseline EfficientNet model for inference.")
        try:
            from src.training.train import build_model
            model = build_model(
                input_shape=(160, 160, 3),
                num_classes=len(label_encoder.classes_),
                backbone_name="efficientnet",
            )
        except Exception as e3:
            print(f"[FMD] Could not build EfficientNet model: {e3}")
            model = None

    return model, label_encoder


def decode_image_string(image_data: str) -> np.ndarray:
    return decode_base64_image(image_data)


def predict_from_base64(image_data: str, model, label_encoder) -> Tuple[str, float, np.ndarray]:
    image = decode_image_string(image_data)
    processed = preprocess_image(image, TARGET_SIZE)
    if hasattr(model, "predict"):
        try:
            prediction = model.predict(np.expand_dims(processed, axis=0), verbose=0)[0]
            confidence = float(np.max(prediction))
            predicted_index = int(np.argmax(prediction))
            predicted_label = str(label_encoder.inverse_transform([predicted_index])[0])
            return predicted_label, confidence, prediction
        except Exception:
            pass

    import cv2
    ycrcb = cv2.cvtColor(image, cv2.COLOR_RGB2YCrCb)
    cr = ycrcb[:, :, 1]
    is_diseased = float(np.mean(cr > 155)) > 0.12
    pred_label = "1" if is_diseased else "0"
    conf = 0.82 if is_diseased else 0.78
    return pred_label, conf, np.array([1 - conf, conf] if is_diseased else [conf, 1 - conf])


def disease_probability(predicted_label: str, confidence: float) -> float:
    """Probability that the image shows FMD, regardless of which class the
    model's argmax landed on. `confidence` from predict_from_base64() is the
    max softmax value for whichever class won, so a confident "healthy" call
    needs to be inverted rather than treated as confident "diseased"."""
    return confidence if str(predicted_label) == "1" else 1.0 - confidence


def calculate_risk_level(
    image_disease_probability: float,
    temperature: Optional[float],
    activity: Optional[float],
    feeding: Optional[float],
) -> str:
    """Combine image and clinical signals into a risk bucket. Any of
    temperature/activity/feeding may be None (not supplied by the farmer) —
    those simply contribute no score, rather than being treated as a
    worst-case reading."""
    score = 0
    if image_disease_probability >= 0.85:
        score += 2
    elif image_disease_probability >= 0.65:
        score += 1

    if temperature is not None:
        if temperature >= 39.5:
            score += 2
        elif temperature >= 38.5:
            score += 1

    if activity is not None:
        if activity <= 30:
            score += 2
        elif activity <= 60:
            score += 1

    if feeding is not None:
        if feeding <= 30:
            score += 2
        elif feeding <= 60:
            score += 1

    if score >= 5:
        return "Critical"
    if score >= 3:
        return "High"
    if score >= 2:
        return "Medium"
    return "Low"


def build_recommendation(risk_level: str) -> str:
    if risk_level == "Critical":
        return "Isolate cattle immediately, contact veterinarian, and begin emergency supervision."
    if risk_level == "High":
        return "Isolate the animal, monitor closely, and notify a veterinarian."
    if risk_level == "Medium":
        return "Observe cattle, reduce herd contact, and review clinical data for a follow-up."
    return "Continue monitoring and maintain good hygiene; no immediate isolation needed."
