"""
Central Configuration for Mastitis Detection Module.
Defines server settings, model file paths, feature schemas, and validation utilities.
"""
import os
import sys
from pathlib import Path
from enum import Enum

# Base directory of the mastitis-module
BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    """Master configuration class for mastitis module."""

    # Server settings
    PORT = int(os.getenv("MASTITIS_PORT", "5002"))
    API_VERSION = "v1"
    API_TITLE = "CattleSense Mastitis Detection API"
    ENABLE_CORS = True
    DEBUG = False

    # Directories
    BASE_DIR = BASE_DIR
    MODEL_DIR = BASE_DIR / "models"
    DATASET_DIR = BASE_DIR / "dataset"
    UPLOAD_DIR = BASE_DIR / "uploads"
    HEATMAP_DIR = UPLOAD_DIR / "heatmaps"
    RESULTS_DIR = BASE_DIR / "results"

    # Model paths
    CNN_MODEL_PATH = MODEL_DIR / "cnn_image_model.keras"
    CNN_MODEL_FALLBACK_PATH = MODEL_DIR / "cnn_image_model.h5"
    MLP_MODEL_PATH = MODEL_DIR / "mlp_numerical_model.keras"
    MLP_MODEL_FALLBACK_PATH = MODEL_DIR / "mlp_numerical_model.h5"
    PREPROCESSOR_PATH = MODEL_DIR / "numerical_preprocessor.pkl"
    MLP_MISSING_AWARE_MODEL_PATH = MODEL_DIR / "mlp_numerical_missing_aware.keras"
    MISSING_AWARE_PREPROCESSOR_PATH = MODEL_DIR / "numerical_missing_aware_preprocessor.pkl"

    # Numerical missing value threshold (0 to 2 allowed for missing-aware model)
    MAX_MISSING_NUMERICAL_FEATURES = 2

    # Upload constraints
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

    # Image specifications (ResNet-50)
    IMAGE_SIZE = (224, 224)
    IMAGE_CHANNELS = 3

    # 6 Numerical dataset features (from dataset/mastitis_data.csv)
    NUMERICAL_FEATURE_NAMES = [
        "Milk_Temperature",
        "Milk_pH",
        "Milk_Conductivity",
        "Somatic_Cell_Count",
        "Milk_Yield",
        "Clotting",
    ]

    # Clinical observation questionnaire questions (farmer-reported metadata)
    CLINICAL_OBSERVATION_FIELDS = [
        "milk_yield_change",
        "milk_appearance",
        "udder_swelling",
        "udder_warmth",
        "udder_pain",
        "body_temperature",
        "appetite",
    ]


class PredictionThreshold(Enum):
    """Prediction confidence thresholds."""
    HIGH_RISK = 0.8
    MEDIUM_RISK = 0.6
    LOW_RISK = 0.4
    NORMAL = 0.0


def get_config():
    """Return active Config instance."""
    return Config()


def validate_numerical_measurements(measurements):
    """
    Validate that numerical measurements list contains 6 elements,
    and all non-null values are valid numbers.
    Features:
      0: Milk_Temperature (float, ~20 - 45 °C)
      1: Milk_pH (float, ~5.0 - 9.0)
      2: Milk_Conductivity (float, ~2.0 - 15.0 mS/cm)
      3: Somatic_Cell_Count (float/int, > 0)
      4: Milk_Yield (float, >= 0)
      5: Clotting (0.0 or 1.0)
    """
    if not isinstance(measurements, (list, tuple)):
        return False, "Numerical measurements must be a list or tuple"

    if len(measurements) != len(Config.NUMERICAL_FEATURE_NAMES):
        return False, f"Expected {len(Config.NUMERICAL_FEATURE_NAMES)} numerical features, got {len(measurements)}"

    for i, val in enumerate(measurements):
        if val is None:
            continue
        try:
            fval = float(val)
            if i == 5 and fval not in (0.0, 1.0):
                return False, f"Clotting feature must be 0 (No) or 1 (Yes), got {val}"
        except (ValueError, TypeError):
            return False, f"Feature '{Config.NUMERICAL_FEATURE_NAMES[i]}' must be numeric, got {val}"

    return True, "Valid"


def format_api_response(success, message, data=None, error=None):
    """Format standard API response adhering to CattleSense contracts."""
    response = {
        "success": success,
        "message": message,
        "api_version": Config.API_VERSION,
    }
    if data is not None:
        response["data"] = data
    if error is not None:
        response["error"] = error
    return response
