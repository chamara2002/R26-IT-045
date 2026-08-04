from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from weather.weather_constants import ALERT_MESSAGES, utc_now
from weather.weather_risk_model import WeatherRiskModel
from weather.weather_forecast_location import fetch_forecast_location
from weather.weather_location_model import FarmerLocationStore
from weather.utils import normalize_hourly_weather

logger = logging.getLogger(__name__)


class WeatherRiskService:
    """Coordinate weather retrieval, risk scoring, and response shaping."""

    def __init__(self, model_path: Optional[Path] = None, location_store: Optional[FarmerLocationStore] = None):
        self.model = WeatherRiskModel(model_path=model_path)
        self.location_store = location_store or FarmerLocationStore()
        self._model_ready = False
        self._load_model_if_available()

    def _load_model_if_available(self) -> None:
        try:
            self.model.load()
            self._model_ready = True
        except (FileNotFoundError, ValueError):
            self._model_ready = False

    def resolve_location(self, farmer_id: str, latitude: Optional[float], longitude: Optional[float]) -> Tuple[float, float]:
        """Use the coordinates given on this request, or fall back to the farmer's saved location.

        If coordinates are given, they are persisted as the farmer's saved location so future
        requests need no manual input at all.
        """
        if latitude is not None and longitude is not None:
            latitude, longitude = float(latitude), float(longitude)
            if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
                raise ValueError("Invalid coordinates: latitude must be -90..90 and longitude -180..180")
            self.location_store.save_location(farmer_id, latitude, longitude)
            return latitude, longitude

        saved = self.location_store.get_location(farmer_id)
        if saved is None:
            raise ValueError(
                "No location on file for this farmer. Provide latitude/longitude once "
                "(e.g. via device geolocation) so it can be saved for future requests."
            )
        return saved

    def get_current_weather_risk(
        self,
        farmer_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        latitude, longitude = self.resolve_location(farmer_id, latitude, longitude)

        try:
            weather_data, error = fetch_forecast_location(latitude, longitude)
        except Exception as exc:  # network/DNS failures not already wrapped by fetch_forecast_location
            raise RuntimeError(f"Weather API unavailable: {exc}") from exc
        if error:
            raise RuntimeError(error.get("error", "Unable to retrieve weather data"))

        summary = normalize_hourly_weather(weather_data)
        rainfall = summary.get("rainfall", 0.0)
        humidity = summary.get("humidity", 0.0)
        temperature = summary.get("temperature", 0.0)

        prediction = self._predict_risk(rainfall, humidity, temperature)
        alert = self._build_alert(prediction)

        return {
            "risk_level": prediction,
            "rainfall": round(rainfall, 2),
            "humidity": round(humidity, 2),
            "temperature": round(temperature, 2),
            "latitude": latitude,
            "longitude": longitude,
            "prediction": prediction,
            "alert_message": alert["message"],
            "alert_title": alert["title"],
            "banner_color": alert["color"],
            "timestamp": utc_now().isoformat(),
        }

    def _predict_risk(self, rainfall: float, humidity: float, temperature: float) -> str:
        if self._model_ready:
            return self.model.predict_single(rainfall, humidity, temperature)
        return self.model._fallback_threshold_prediction(rainfall, humidity, temperature)

    def _build_alert(self, risk_level: str) -> Dict[str, Any]:
        return ALERT_MESSAGES.get(risk_level, ALERT_MESSAGES["LOW"])
