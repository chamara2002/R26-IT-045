"""Configuration for the Lumpy Skin Disease (LSD) Detection module."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Config:
    """API and pipeline configuration."""

    # Model paths
    MODEL_DIR = BASE_DIR / "models"
    YOLO_WEIGHTS_PATH = MODEL_DIR / "yolov8s_lsd_best.pt"
    RESNET_WEIGHTS_PATH = MODEL_DIR / "resnet50_lsd_best.keras"

    # Vision pipeline settings — validated in the project's Colab notebooks
    # (see ipynb files/INTEGRATED_PIPELINE_v4_Final.ipynb)
    CONF_THRESHOLD = 0.35
    IOU_THRESHOLD = 0.45
    RESNET_IMG_SIZE = 224

    # Risk guidance thresholds (proposal Section 3.6)
    LOW_RISK_MAX = 0.30
    MODERATE_RISK_MAX = 0.70

    # Hybrid fusion: how much weight the vision pipeline gets vs. farmer-reported
    # symptoms when both are available. 70/30 mirrors this project's mastitis
    # module (IMAGE_WEIGHT=0.7) since the image is the primary, more reliable
    # signal and symptoms are a supportive secondary signal.
    IMAGE_WEIGHT = 0.7
    SYMPTOM_WEIGHT = round(1 - IMAGE_WEIGHT, 4)

    # Upload handling
    UPLOAD_DIR = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "webp"}

    # API metadata
    API_VERSION = "v1"
    API_TITLE = "Lumpy Skin Disease Detection API"
    DEBUG = False


def get_config():
    """Get API configuration."""
    return Config()


def risk_guidance(probability):
    """Map an overall LSD probability to a risk level + guidance message."""
    if probability < Config.LOW_RISK_MAX:
        return "LOW RISK", "Continue monitoring. Maintain regular health checks."
    if probability < Config.MODERATE_RISK_MAX:
        return "MODERATE RISK", "Isolate the animal and monitor closely. Consider consulting a veterinarian."
    return "HIGH RISK", "Immediate veterinary consultation strongly advised. Isolate the animal from the herd."


def format_api_response(success, message, data=None, error=None):
    """Format a standard API response envelope."""
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
