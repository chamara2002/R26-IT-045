"""
API Configuration for the Lumpy Skin Disease (LSD) Detection Module.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    """API configuration."""

    MODEL_DIR = BASE_DIR / "models"
    RESNET_WEIGHTS_PATH = MODEL_DIR / "resnet50_lsd_model.pth"
    RESNET_METADATA_PATH = MODEL_DIR / "resnet50_lsd_metadata.json"

    UPLOAD_DIR = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp"}

    API_VERSION = "v1"
    API_TITLE = "Lumpy Skin Disease Detection API"

    IMAGE_SIZE = (224, 224)
    NORMALIZE_MEAN = [0.485, 0.456, 0.406]
    NORMALIZE_STD = [0.229, 0.224, 0.225]
    CLASS_NAMES = {0: "Healthy Skin", 1: "Lumpy Skin Disease"}

    # Weight given to the image-based classifier vs the optional symptom
    # checklist when both are available (mirrors the mastitis module's
    # image_weight fusion pattern).
    IMAGE_WEIGHT = 0.75

    # Risk thresholds from the LSD component proposal (Section 3.6):
    # Low 0-30%, Medium 30-70%, High 70-100%.
    LOW_RISK_MAX = 0.30
    MEDIUM_RISK_MAX = 0.70


def get_config():
    return Config()


def format_api_response(success, message, data=None, error=None):
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
