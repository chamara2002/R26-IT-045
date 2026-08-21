"""
Backwards-compatible API configuration wrapper.
Re-exports configuration settings and validation utilities from config.config.
"""
from config.config import (
    Config,
    PredictionThreshold,
    get_config,
    validate_numerical_measurements,
    format_api_response,
    BASE_DIR,
)

__all__ = [
    "Config",
    "PredictionThreshold",
    "get_config",
    "validate_numerical_measurements",
    "format_api_response",
    "BASE_DIR",
]
