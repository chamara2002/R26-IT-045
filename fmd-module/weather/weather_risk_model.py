from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from weather.weather_constants import DEFAULT_THRESHOLDS

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "trained_models" / "weather_risk_rf.pkl"
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)


class WeatherRiskModel:
    """Temporary threshold-based weather risk engine with a Random Forest scaffold."""

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or MODEL_PATH
        self.model = None
        self._is_trained = False

    def train(self, X: List[List[float]], y: List[str]) -> None:
        """Placeholder training routine. Replace with historical dataset training later."""
        if len(X) < 2 or len(y) < 2:
            raise ValueError("At least two samples are required to train the weather risk model")

        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(np.array(X, dtype=float), np.array(y, dtype=object))
        self._is_trained = True
        self.save()

    def save(self) -> None:
        if not self.model:
            raise ValueError("No trained model available to save")
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, self.model_path)

    def load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(f"Weather model not found at {self.model_path}")
        self.model = joblib.load(self.model_path)
        self._is_trained = True

    def predict(self, features: List[List[float]]) -> List[str]:
        if not self.model:
            raise ValueError("Weather model is not loaded")
        return [str(label) for label in self.model.predict(np.array(features, dtype=float))]

    def predict_single(self, rainfall: float, humidity: float, temperature: float) -> str:
        if not self.model:
            return self._fallback_threshold_prediction(rainfall, humidity, temperature)
        labels = self.predict([[rainfall, humidity, temperature]])
        return labels[0]

    def _fallback_threshold_prediction(self, rainfall: float, humidity: float, temperature: float) -> str:
        if rainfall >= DEFAULT_THRESHOLDS["rainfall_high"] and humidity > DEFAULT_THRESHOLDS["humidity_high"] and DEFAULT_THRESHOLDS["temperature_low"] <= temperature <= DEFAULT_THRESHOLDS["temperature_high"]:
            return "HIGH"
        if rainfall >= DEFAULT_THRESHOLDS["rainfall_high"] / 2 or humidity > DEFAULT_THRESHOLDS["humidity_high"] / 1.2 or (DEFAULT_THRESHOLDS["temperature_low"] <= temperature <= DEFAULT_THRESHOLDS["temperature_high"]):
            return "MEDIUM"
        return "LOW"
