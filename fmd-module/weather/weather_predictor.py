from __future__ import annotations

from typing import Any, Dict

from weather.weather_service import WeatherRiskService


class WeatherPredictor:
    """Thin wrapper for weather risk scoring used by routes or future UI hooks."""

    def __init__(self) -> None:
        self.service = WeatherRiskService()

    def assess(self, farmer_id: str, latitude: float | None = None, longitude: float | None = None) -> Dict[str, Any]:
        return self.service.get_current_weather_risk(farmer_id, latitude, longitude)
