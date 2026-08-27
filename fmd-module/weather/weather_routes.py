from __future__ import annotations

from datetime import datetime
from typing import Any, Dict
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, request

from weather.seasonal_risk import compute_environmental_risk
from weather.sri_lanka_districts import list_districts, resolve_district
from weather.weather_history_model import WeatherHistoryStore
from weather.weather_location_model import FarmerLocationStore
from weather.weather_service import WeatherRiskService

weather_blueprint = Blueprint("weather_blueprint", __name__)
weather_service = WeatherRiskService()
weather_store = WeatherHistoryStore()
location_store = FarmerLocationStore()

# The DAPH Dec-Feb seasonal rule is a Sri Lanka-specific calendar check, so
# it must be evaluated in Sri Lanka local time, not server/UTC time.
SRI_LANKA_TZ = ZoneInfo("Asia/Colombo")


@weather_blueprint.get("/weather/districts")
def get_districts():
    """List the districts the farmer can pick as their farm location."""
    return jsonify({"districts": list_districts()}), 200


@weather_blueprint.get("/weather/current-risk")
def current_risk():
    """Return current weather + FMD risk for a farmer.

    latitude/longitude are optional: if omitted, the farmer's last saved
    location is used automatically. If provided, they are saved for next time.
    """
    farmer_id = request.args.get("farmer_id", "default")
    latitude = request.args.get("latitude")
    longitude = request.args.get("longitude")

    try:
        result = weather_service.get_current_weather_risk(
            farmer_id,
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None,
        )
        weather_store.save_daily_record(farmer_id, result["rainfall"], result["temperature"], result["humidity"], result["risk_level"])

        # DAPH-based historical seasonal escalation (see weather/seasonal_risk.py).
        # Additive only: risk_level/prediction (the raw weather-only risk) are
        # unchanged and still present, so existing frontend code keeps working.
        seasonal = compute_environmental_risk(datetime.now(SRI_LANKA_TZ).date(), result["risk_level"])
        result.update(seasonal)

        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": "Weather risk assessment failed", "details": str(exc)}), 500


@weather_blueprint.post("/weather/location")
def save_location():
    """Register/update a farmer's farm location so weather can be auto-fetched later.

    Preferred: {"farmer_id": ..., "district": "Anuradhapura"} — the farmer picks
    their district on the FMD page (not browser GPS); it is resolved to
    coordinates via weather/sri_lanka_districts.py.

    Also accepts raw {"latitude": ..., "longitude": ...} for callers (e.g.
    tests, or a future exact-location entry point) that already have
    coordinates and no district name.
    """
    payload = request.get_json(silent=True) or {}
    farmer_id = str(payload.get("farmer_id") or request.args.get("farmer_id") or "default")
    district = payload.get("district")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    if district:
        try:
            latitude, longitude = resolve_district(district)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
    elif latitude is not None and longitude is not None:
        try:
            latitude, longitude = float(latitude), float(longitude)
            if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
                raise ValueError("Invalid coordinates: latitude must be -90..90 and longitude -180..180")
        except (TypeError, ValueError) as exc:
            return jsonify({"error": str(exc) or "Invalid coordinates"}), 400
        district = None
    else:
        return jsonify({"error": "district (preferred) or latitude/longitude are required"}), 400

    location_store.save_location(farmer_id, latitude, longitude, district=district)
    return jsonify({"farmer_id": farmer_id, "district": district, "latitude": latitude, "longitude": longitude}), 200


@weather_blueprint.get("/weather/location")
def get_location():
    """Return a farmer's previously saved farm location, if any."""
    farmer_id = request.args.get("farmer_id", "default")
    saved = location_store.get_location_details(farmer_id)
    if saved is None:
        return jsonify({"error": "No location saved for this farmer"}), 404

    return jsonify({"farmer_id": farmer_id, **saved}), 200


@weather_blueprint.get("/weather/history")
def history():
    farmer_id = request.args.get("farmer_id", "default")
    return jsonify(weather_store.get_history(farmer_id, days=30)), 200


@weather_blueprint.get("/weather/trend")
def trend():
    farmer_id = request.args.get("farmer_id", "default")
    history = weather_store.get_history(farmer_id, days=7)
    return jsonify({
        "labels": [item["date"] for item in history],
        "series": [item["predicted_risk"] for item in history],
        "history": history,
    }), 200
