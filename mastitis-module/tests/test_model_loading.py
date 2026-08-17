"""
Unit tests for Model 1 (CNN), Model 2 (Complete MLP), and Model 2 (Missing-Aware MLP).
"""
import sys
from pathlib import Path
import pytest
import numpy as np
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config.config import get_config


def test_model_1_file_exists():
    """Verify that cnn_image_model.keras exists and has valid non-zero size."""
    config = get_config()
    assert config.CNN_MODEL_PATH.exists(), f"Model 1 file missing at {config.CNN_MODEL_PATH}"
    size_mb = config.CNN_MODEL_PATH.stat().st_size / (1024 * 1024)
    assert size_mb > 50.0, f"Model 1 file suspiciously small: {size_mb:.2f} MB"


def test_model_1_loading_and_architecture():
    """Verify that Model 1 loads into Keras and has expected input/output shapes."""
    from tensorflow import keras
    config = get_config()

    model = keras.models.load_model(str(config.CNN_MODEL_PATH))
    assert model is not None
    assert model.input_shape == (None, 224, 224, 3), f"Unexpected input shape: {model.input_shape}"
    assert model.output_shape == (None, 1), f"Unexpected output shape: {model.output_shape}"


def test_model_1_dummy_inference():
    """Verify that running forward pass on Model 1 produces a valid probability [0.0, 1.0]."""
    from tensorflow import keras
    config = get_config()

    model = keras.models.load_model(str(config.CNN_MODEL_PATH))
    dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
    pred = model.predict(dummy_input, verbose=0)

    assert pred.shape == (1, 1)
    prob = float(pred[0][0])
    assert 0.0 <= prob <= 1.0, f"Probability out of bounds: {prob}"


def test_model_2_complete_file_and_scaler_exist():
    """Verify that complete mlp_numerical_model.keras and numerical_preprocessor.pkl exist."""
    config = get_config()
    assert config.MLP_MODEL_PATH.exists(), f"Model 2 file missing at {config.MLP_MODEL_PATH}"
    assert config.PREPROCESSOR_PATH.exists(), f"Preprocessor missing at {config.PREPROCESSOR_PATH}"


def test_model_2_complete_loading_and_architecture():
    """Verify that Complete Model 2 loads into Keras with input (None, 6) and output (None, 1)."""
    from tensorflow import keras
    config = get_config()

    model = keras.models.load_model(str(config.MLP_MODEL_PATH))
    assert model is not None
    assert model.input_shape == (None, 6), f"Unexpected Model 2 input shape: {model.input_shape}"
    assert model.output_shape == (None, 1), f"Unexpected Model 2 output shape: {model.output_shape}"


def test_model_2_complete_inference_with_scaler():
    """Verify that Complete Model 2 predicts valid probabilities when fed scaled 6-feature inputs."""
    from tensorflow import keras
    config = get_config()

    model = keras.models.load_model(str(config.MLP_MODEL_PATH))
    scaler = joblib.load(str(config.PREPROCESSOR_PATH))

    # Test sample: [Milk_Temp, Milk_pH, Milk_Cond, SCC, Milk_Yield, Clotting]
    sample = np.array([[38.5, 7.2, 7.5, 800.0, 10.0, 1.0]], dtype=np.float32)
    scaled = scaler.transform(sample)
    pred = model.predict(scaled, verbose=0)

    assert pred.shape == (1, 1)
    prob = float(pred[0][0])
    assert 0.0 <= prob <= 1.0, f"Probability out of bounds: {prob}"


def test_model_2_missing_aware_file_and_preprocessor_exist():
    """Verify that mlp_numerical_missing_aware.keras and preprocessor exist."""
    config = get_config()
    assert config.MLP_MISSING_AWARE_MODEL_PATH.exists()
    assert config.MISSING_AWARE_PREPROCESSOR_PATH.exists()


def test_model_2_missing_aware_loading_and_architecture():
    """Verify that Missing-Aware Model 2 loads into Keras with input (None, 12) and output (None, 1)."""
    from tensorflow import keras
    config = get_config()

    model = keras.models.load_model(str(config.MLP_MISSING_AWARE_MODEL_PATH))
    assert model is not None
    assert model.input_shape == (None, 12), f"Unexpected input shape: {model.input_shape}"
    assert model.output_shape == (None, 1), f"Unexpected output shape: {model.output_shape}"


def test_model_2_missing_aware_inference_with_preprocessor():
    """Verify that Missing-Aware Model 2 predicts valid probabilities from 12-element vector."""
    from tensorflow import keras
    config = get_config()

    model = keras.models.load_model(str(config.MLP_MISSING_AWARE_MODEL_PATH))
    preproc = joblib.load(str(config.MISSING_AWARE_PREPROCESSOR_PATH))

    medians = preproc["train_medians"]
    scaler = preproc["scaler"]

    # Sample with Milk_pH missing (index 1 missing)
    mask = [0.0, 1.0, 0.0, 0.0, 0.0, 0.0]
    imputed = [38.5, float(medians[1]), 7.5, 800.0, 10.0, 1.0]
    scaled = scaler.transform([imputed])[0]
    vec12 = np.concatenate([scaled, mask]).reshape(1, 12).astype(np.float32)

    pred = model.predict(vec12, verbose=0)
    assert pred.shape == (1, 1)
    prob = float(pred[0][0])
    assert 0.0 <= prob <= 1.0, f"Probability out of bounds: {prob}"
