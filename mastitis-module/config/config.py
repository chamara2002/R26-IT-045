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

    # Baseline reference / normal values for imputation when partial features provided
    BASELINE_FEATURES = {
        "Milk_Temperature": 38.5,
        "Milk_pH": 6.65,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 15.0,
        "Clotting": 0,
    }

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


def validate_numerical_measurements(data_dict, allow_partial=False):
    """
    Validate that numerical features are present, non-null, and well-typed within realistic ranges.
    
    Features:
      1. Milk_Temperature: float (milk temperature in °C, realistic bounds: 20.0 - 45.0 °C)
      2. Milk_pH: float (milk pH, realistic bounds: 4.5 - 8.5)
      3. Milk_Conductivity: float (milk electrical conductivity in mS/cm, realistic bounds: 1.5 - 15.0)
      4. Milk_Yield: float (milk yield in L/day, realistic bounds: 0.0 - 100.0)
      5. Clotting: int (0: No Clotting, 1: Clotting Present)
    """
    if not isinstance(data_dict, dict):
        return False, "Prediction payload must be a JSON object or form data"

    if not allow_partial:
        missing = []
        for feat in Config.REQUIRED_FEATURES:
            val = data_dict.get(feat)
            if val is None or val == "":
                missing.append(feat)

        if missing:
            return False, f"Missing required model features: {', '.join(missing)}. All 5 features are strictly required."

    # 1. Validate Milk_Temperature if present
    if "Milk_Temperature" in data_dict and data_dict["Milk_Temperature"] not in (None, "", "null"):
        try:
            temp_val = float(data_dict["Milk_Temperature"])
            if temp_val < 20.0 or temp_val > 45.0:
                return False, f"Feature 'Milk_Temperature' must be a realistic milk temperature between 20.0 and 45.0 °C, got {temp_val}"
        except (ValueError, TypeError):
            return False, f"Feature 'Milk_Temperature' must be numeric, got {data_dict['Milk_Temperature']}"

    # 2. Validate Milk_pH if present
    if "Milk_pH" in data_dict and data_dict["Milk_pH"] not in (None, "", "null"):
        try:
            ph_val = float(data_dict["Milk_pH"])
            if ph_val < 4.5 or ph_val > 8.5:
                return False, f"Feature 'Milk_pH' must be between 4.5 and 8.5, got {ph_val}"
        except (ValueError, TypeError):
            return False, f"Feature 'Milk_pH' must be numeric, got {data_dict['Milk_pH']}"

    # 3. Validate Milk_Conductivity if present
    if "Milk_Conductivity" in data_dict and data_dict["Milk_Conductivity"] not in (None, "", "null"):
        try:
            cond_val = float(data_dict["Milk_Conductivity"])
            if cond_val < 1.5 or cond_val > 15.0:
                return False, f"Feature 'Milk_Conductivity' must be between 1.5 and 15.0 mS/cm, got {cond_val}"
        except (ValueError, TypeError):
            return False, f"Feature 'Milk_Conductivity' must be numeric, got {data_dict['Milk_Conductivity']}"

    # 4. Validate Milk_Yield if present
    if "Milk_Yield" in data_dict and data_dict["Milk_Yield"] not in (None, "", "null"):
        try:
            yield_val = float(data_dict["Milk_Yield"])
            if yield_val < 0.0 or yield_val > 100.0:
                return False, f"Feature 'Milk_Yield' must be between 0.0 and 100.0 L/day, got {yield_val}"
        except (ValueError, TypeError):
            return False, f"Feature 'Milk_Yield' must be numeric, got {data_dict['Milk_Yield']}"

    # 5. Validate Clotting if present
    if "Clotting" in data_dict and data_dict["Clotting"] not in (None, "", "null"):
        raw_c = data_dict["Clotting"]
        if isinstance(raw_c, bool):
            clotting_int = 1 if raw_c else 0
        elif str(raw_c).strip().lower() in ("true", "1", "yes"):
            clotting_int = 1
        elif str(raw_c).strip().lower() in ("false", "0", "no"):
            clotting_int = 0
        else:
            try:
                clotting_int = int(raw_c)
            except (ValueError, TypeError):
                return False, f"Feature 'Clotting' must be 0 (No) or 1 (Yes), got {raw_c}"
        if clotting_int not in (0, 1):
            return False, f"Feature 'Clotting' must be 0 or 1, got {raw_c}"

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
