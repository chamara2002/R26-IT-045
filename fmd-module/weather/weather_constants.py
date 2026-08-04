from __future__ import annotations

from datetime import datetime, timezone

ALERT_MESSAGES = {
    "HIGH": {
        "color": "Red",
        "title": "WARNING",
        "message": "Current weather conditions in your area are highly favourable for FMD spread. Take precautionary measures: isolate new animals, improve hygiene, prepare vaccination, and monitor herd.",
    },
    "MEDIUM": {
        "color": "Amber",
        "title": "CAUTION",
        "message": "Weather conditions may increase FMD risk in the coming days. Monitor your herd carefully and maintain standard biosecurity practices.",
    },
    "LOW": {
        "color": "Green",
        "title": "CONDITIONS NORMAL",
        "message": "Current weather presents low FMD risk. Continue routine herd monitoring.",
    },
}

DEFAULT_THRESHOLDS = {
    "rainfall_high": 8.0,
    "humidity_high": 60.0,
    "temperature_low": 10.0,
    "temperature_high": 20.0,
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
