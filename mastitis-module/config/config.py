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

    # Model 1 paths & configs (ResNet50 Image Model)
    CNN_MODEL_PATH = MODEL_DIR / "model1" / "mastitis_image_model.keras"
    MODEL_1_DIR = MODEL_DIR / "model1"
    MODEL_1_CLASS_NAMES_PATH = MODEL_1_DIR / "class_names.json"
    MODEL_1_PREPROCESSING_CONFIG_PATH = MODEL_1_DIR / "preprocessing_config.json"
    MODEL_1_THRESHOLD_PATH = MODEL_1_DIR / "threshold.json"
    MODEL_1_GRADCAM_PATH = MODEL_1_DIR / "gradcam_explainer.py"
    METRICS_PATH = BASE_DIR / "docs" / "metrics.json"
    TRAINING_HISTORY_PATH = BASE_DIR / "docs" / "training_history.json"

    # Model 2 paths (Decision Tree Classifier)
    MODEL_2_PATH = MODEL_DIR / "model2" / "decision_tree_model.joblib"
    MODEL_2_FALLBACK_PATH = MODEL_DIR / "decision_tree_model.joblib"
    METADATA_PATH = MODEL_DIR / "model2" / "model2_metadata.json"
    FEATURE_ORDER_PATH = MODEL_DIR / "model2" / "model2_feature_order.json"

    # Upload constraints
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

    # Image specifications (ResNet50)
    IMAGE_SIZE = (224, 224)
    IMAGE_CHANNELS = 3

    # Exact 5 features required by decision_tree_model.joblib
    REQUIRED_FEATURES = [
        "Milk_Temperature",
        "Milk_pH",
        "Milk_Conductivity",
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

    # Uncertainty-aware messaging configuration
    UNCERTAINTY_BORDERLINE_DELTA = 0.15
    DEFAULT_BORDERLINE_NOTE = (
        "This result is close to the decision boundary. "
        "Consider a follow-up test or veterinary consultation for confirmation."
    )


class PredictionThreshold(Enum):
    """Prediction confidence thresholds."""
    HIGH_RISK = 0.8
    MEDIUM_RISK = 0.6
    LOW_RISK = 0.4
    NORMAL = 0.0


def get_config():
    """Return active Config instance."""
    return Config()


def validate_numerical_measurements(data_dict):
    """
    Validate that all 5 required features are present, non-null, and well-typed.
    No fallback or default values are permitted.

    Features:
      1. Milk_Temperature: float (milk temperature in °C, realistic bounds: 30.0 - 45.0 °C, dataset: 34.04 - 39.38 °C)
      2. Milk_pH: float (milk pH, realistic bounds: 6.0 - 8.0, dataset: 6.35 - 7.42)
      3. Milk_Conductivity: float (milk electrical conductivity in mS/cm, realistic bounds: 3.0 - 10.0, dataset: 3.75 - 8.09)
      4. Milk_Yield: float (milk yield in L/day, realistic bounds: 0.0 - 50.0, dataset: 4.70 - 28.60)
      5. Clotting: int (0: No Clotting, 1: Clotting Present)
    """
    if not isinstance(data_dict, dict):
        return False, "Prediction payload must be a JSON object or form data"

    missing = []
    for feat in Config.REQUIRED_FEATURES:
        val = data_dict.get(feat)
        if val is None or val == "":
            missing.append(feat)

    if missing:
        return False, f"Missing required model features: {', '.join(missing)}. All 5 features are strictly required."

    # 1. Validate Milk_Temperature
    try:
        temp_val = float(data_dict["Milk_Temperature"])
        if temp_val < 30.0 or temp_val > 45.0:
            return False, f"Feature 'Milk_Temperature' must be a realistic bovine milk temperature between 30.0 and 45.0 °C, got {temp_val}"
    except (ValueError, TypeError):
        return False, f"Feature 'Milk_Temperature' must be numeric, got {data_dict['Milk_Temperature']}"

    # 2. Validate Milk_pH
    try:
        ph_val = float(data_dict["Milk_pH"])
        if ph_val < 6.0 or ph_val > 8.0:
            return False, f"Feature 'Milk_pH' must be between 6.0 and 8.0, got {ph_val}"
    except (ValueError, TypeError):
        return False, f"Feature 'Milk_pH' must be numeric, got {data_dict['Milk_pH']}"

    # 3. Validate Milk_Conductivity
    try:
        cond_val = float(data_dict["Milk_Conductivity"])
        if cond_val < 3.0 or cond_val > 10.0:
            return False, f"Feature 'Milk_Conductivity' must be between 3.0 and 10.0 mS/cm, got {cond_val}"
    except (ValueError, TypeError):
        return False, f"Feature 'Milk_Conductivity' must be numeric, got {data_dict['Milk_Conductivity']}"

    # 4. Validate Milk_Yield
    try:
        yield_val = float(data_dict["Milk_Yield"])
        if yield_val < 0.0 or yield_val > 50.0:
            return False, f"Feature 'Milk_Yield' must be between 0.0 and 50.0 L/day, got {yield_val}"
    except (ValueError, TypeError):
        return False, f"Feature 'Milk_Yield' must be numeric, got {data_dict['Milk_Yield']}"

    # 5. Validate Clotting
    try:
        clotting_val = int(data_dict["Clotting"])
        if clotting_val not in (0, 1):
            return False, f"Feature 'Clotting' must be 0 (No) or 1 (Yes), got {clotting_val}"
    except (ValueError, TypeError):
        return False, f"Feature 'Clotting' must be 0 or 1, got {data_dict['Clotting']}"

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
