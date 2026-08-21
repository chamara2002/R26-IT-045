from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_hourly_weather(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not payload:
        return {}

    hourly = payload.get("weather_forecast_parameters", {}).get("hourly", {}) or {}
    if not hourly:
        return {}

    temperature_series = hourly.get("temperature_2m", []) or []
    humidity_series = hourly.get("relative_humidity_2m", []) or []
    precipitation_series = hourly.get("precipitation", []) or []
    rain_series = hourly.get("rain", []) or []

    rainfall_values = [safe_float(value) for value in (precipitation_series or rain_series)]
    temperature_values = [safe_float(value) for value in temperature_series]
    humidity_values = [safe_float(value) for value in humidity_series]

    if not rainfall_values:
        rainfall_values = [0.0] * max(len(temperature_values), len(humidity_values), 1)
    if not temperature_values:
        temperature_values = [0.0] * len(rainfall_values)
    if not humidity_values:
        humidity_values = [0.0] * len(rainfall_values)

    if len(rainfall_values) != len(temperature_values):
        length = min(len(rainfall_values), len(temperature_values))
        rainfall_values = rainfall_values[:length]
        temperature_values = temperature_values[:length]
        humidity_values = humidity_values[:length]

    if len(humidity_values) != len(rainfall_values):
        length = min(len(humidity_values), len(rainfall_values))
        rainfall_values = rainfall_values[:length]
        temperature_values = temperature_values[:length]
        humidity_values = humidity_values[:length]

    # Temperature/humidity are reported as the daily average of the hourly
    # readings; rainfall is a daily TOTAL (sum of hourly precipitation), not
    # an average — averaging would understate how much rain actually fell.
    return {
        "temperature": round(sum(temperature_values) / max(len(temperature_values), 1), 2),
        "humidity": round(sum(humidity_values) / max(len(humidity_values), 1), 2),
        "rainfall": round(sum(rainfall_values), 2),
        "hourly_count": len(rainfall_values),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
