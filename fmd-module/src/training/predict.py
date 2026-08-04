import base64
from pathlib import Path
from typing import Tuple

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
    if not MODEL_PATH.exists() or not ENCODER_PATH.exists():
        raise FileNotFoundError("Model and label encoder must be trained before prediction.")

    model = load_model(MODEL_PATH)
    label_encoder = load_pickle(ENCODER_PATH)
    return model, label_encoder


def decode_image_string(image_data: str) -> np.ndarray:
    return decode_base64_image(image_data)


def predict_from_base64(image_data: str, model, label_encoder) -> Tuple[str, float, np.ndarray]:
    image = decode_image_string(image_data)
    processed = preprocess_image(image, TARGET_SIZE)
    prediction = model.predict(np.expand_dims(processed, axis=0), verbose=0)[0]
    confidence = float(np.max(prediction))
    predicted_index = int(np.argmax(prediction))
    predicted_label = label_encoder.inverse_transform([predicted_index])[0]
    return predicted_label, confidence, prediction


def calculate_risk_level(confidence: float, temperature: float, activity: float, feeding: float) -> str:
    score = 0
    if confidence >= 0.85:
        score += 2
    elif confidence >= 0.65:
        score += 1

    if temperature >= 39.5:
        score += 2
    elif temperature >= 38.5:
        score += 1

    if activity <= 30:
        score += 2
    elif activity <= 60:
        score += 1

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
