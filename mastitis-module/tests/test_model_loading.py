"""
Unit tests for Model 1 (CNN) and Model 2 (Logistic Regression Pipeline).
"""
import sys
from pathlib import Path
import pytest
import numpy as np
import pandas as pd
import joblib
import json

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config.config import get_config


def test_model_1_files_and_configs_exist():
    """Verify that Model 1 .keras and all authoritative config files exist."""
    config = get_config()
    assert config.CNN_MODEL_PATH.exists(), f"Model 1 not found at {config.CNN_MODEL_PATH}"
    assert config.MODEL_1_CLASS_NAMES_PATH.exists()
    assert config.MODEL_1_PREPROCESSING_CONFIG_PATH.exists()
    assert config.MODEL_1_THRESHOLD_PATH.exists()


def test_model_1_config_content():
    """Verify Model 1 configuration files contain correct schemas and values."""
    config = get_config()
    with open(config.MODEL_1_CLASS_NAMES_PATH, "r") as f:
        classes = json.load(f)
    assert classes == {"0": "normal", "1": "mastitis"}

    with open(config.MODEL_1_THRESHOLD_PATH, "r") as f:
        t_data = json.load(f)
    threshold_val = t_data.get("selected_threshold", t_data.get("threshold"))
    assert threshold_val == 0.25

    with open(config.MODEL_1_PREPROCESSING_CONFIG_PATH, "r") as f:
        prep = json.load(f)
    assert prep["target_size"] == [224, 224]
    assert "preprocess_function" in prep or "resize_strategy" in prep


def test_model_1_keras_loading_and_inference():
    """Verify that mastitis_image_model.keras loads cleanly and predicts on a 224x224 input tensor."""
    config = get_config()
    from tensorflow import keras
    model = keras.models.load_model(str(config.CNN_MODEL_PATH))
    assert model is not None

    dummy_input = np.random.uniform(-1.0, 1.0, (1, 224, 224, 3)).astype(np.float32)
    preds = model.predict(dummy_input, verbose=0)
    assert preds.shape == (1, 1)
    assert 0.0 <= float(preds[0, 0]) <= 1.0


def test_model_2_files_exist():
    """Verify that decision_tree_model.joblib and model metadata exist."""
    config = get_config()
    assert config.MODEL_2_PATH.exists() or config.MODEL_2_FALLBACK_PATH.exists()
    assert config.METADATA_PATH.exists()


def test_model_2_metadata_content():
    """Verify metadata has required features."""
    config = get_config()
    with open(config.METADATA_PATH, "r") as f:
        meta = json.load(f)

    assert meta["model_type"] == "DecisionTreeClassifier"
    assert meta["features"] == [
        "Milk_Temperature",
        "Milk_pH",
        "Milk_Conductivity",
        "Milk_Yield",
        "Clotting"
    ]


def test_model_2_pipeline_loading_and_inference():
    """Verify that decision_tree_model.joblib loads via joblib and runs inference on DataFrame."""
    config = get_config()
    m2_path = config.MODEL_2_PATH if config.MODEL_2_PATH.exists() else config.MODEL_2_FALLBACK_PATH
    model = joblib.load(str(m2_path))
    assert model is not None

    df = pd.DataFrame([{
        "Milk_Temperature": 36.5,
        "Milk_pH": 6.7,
        "Milk_Conductivity": 4.8,
        "Milk_Yield": 18.0,
        "Clotting": 0,
    }])

    preds = model.predict(df)
    probas = model.predict_proba(df)

    assert preds.shape == (1,)
    assert preds[0] in (0, 1)
    assert probas.shape == (1, 2)
    assert 0.0 <= probas[0][0] <= 1.0
    assert 0.0 <= probas[0][1] <= 1.0
    assert np.isclose(probas[0][0] + probas[0][1], 1.0)
