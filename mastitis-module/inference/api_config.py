"""
API Configuration for Mastitis Detection Module
Defines settings, endpoints, and utilities for Flask API.
"""
import sys
from pathlib import Path
from enum import Enum

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    """API Configuration."""
    
    # Model paths
    MODEL_DIR = BASE_DIR / 'models'
    CNN_MODEL_PATH = MODEL_DIR / 'cnn_image_model.h5'
    RF_MODEL_PATH = MODEL_DIR / 'rf_health_model.pkl'
    PREPROCESSOR_PATH = MODEL_DIR / 'numerical_preprocessor.pkl'
    
    # Upload settings
    UPLOAD_DIR = BASE_DIR / 'uploads'
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}
    
    # API settings
    API_VERSION = 'v1'
    API_TITLE = 'Mastitis Detection API'
    ENABLE_CORS = True
    DEBUG = False
    
    # Model settings
    IMAGE_SIZE = (224, 224)
    IMAGE_WEIGHT = 0.7  # Weight for image prediction in hybrid model
    
    # Health metrics settings
    HEALTH_METRIC_FEATURES = 6  # Number of health features
    HEALTH_FEATURES_NAMES = [
        'body_temperature',
        'milk_yield',
        'somatic_cell_count',
        'milk_fat_percentage',
        'milk_protein_percentage',
        'lactose_percentage'
    ]


class PredictionThreshold(Enum):
    """Prediction confidence thresholds."""
    
    HIGH_RISK = 0.8  # High confidence of mastitis
    MEDIUM_RISK = 0.6  # Medium confidence
    LOW_RISK = 0.4  # Low confidence
    NORMAL = 0.0  # Below threshold


def get_config():
    """Get API configuration."""
    return Config()


def validate_health_metrics(metrics):
    """Validate health metrics format and values."""
    if not isinstance(metrics, (list, tuple)):
        return False, "Metrics must be a list or tuple"
    
    if len(metrics) != Config.HEALTH_METRIC_FEATURES:
        return False, f"Expected {Config.HEALTH_METRIC_FEATURES} metrics, got {len(metrics)}"
    
    for i, metric in enumerate(metrics):
        try:
            float(metric)
        except (ValueError, TypeError):
            return False, f"Metric {i} ({Config.HEALTH_FEATURES_NAMES[i]}) must be numeric"
    
    return True, "Valid"


def format_api_response(success, message, data=None, error=None):
    """Format standard API response."""
    response = {
        'success': success,
        'message': message,
        'api_version': Config.API_VERSION,
    }
    
    if data is not None:
        response['data'] = data
    
    if error is not None:
        response['error'] = error
    
    return response


if __name__ == '__main__':
    config = get_config()
    print(f"API Version: {config.API_VERSION}")
    print(f"CNN Model: {config.CNN_MODEL_PATH}")
    print(f"RF Model: {config.RF_MODEL_PATH}")
    print(f"Image Weight: {config.IMAGE_WEIGHT}")
    print(f"Health Features: {config.HEALTH_FEATURES_NAMES}")
