from __future__ import annotations

from typing import Any, Dict

from flask import Blueprint, jsonify, request

from weather.weather_history_model import WeatherHistoryStore
from weather.weather_location_model import FarmerLocationStore
from weather.weather_service import WeatherRiskService

weather_blueprint = Blueprint("weather_blueprint", __name__)
weather_service = WeatherRiskService()
weather_store = WeatherHistoryStore()
location_store = FarmerLocationStore()


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
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": "Weather risk assessment failed", "details": str(exc)}), 500


@weather_blueprint.post("/weather/location")
def save_location():
    """Register/update a farmer's farm coordinates so weather can be auto-fetched later."""
    payload = request.get_json(silent=True) or {}
    farmer_id = str(payload.get("farmer_id") or request.args.get("farmer_id") or "default")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    try:
        latitude, longitude = float(latitude), float(longitude)
        if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
            raise ValueError("Invalid coordinates: latitude must be -90..90 and longitude -180..180")
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc) or "Invalid coordinates"}), 400

    location_store.save_location(farmer_id, latitude, longitude)
    return jsonify({"farmer_id": farmer_id, "latitude": latitude, "longitude": longitude}), 200


@weather_blueprint.get("/weather/location")
def get_location():
    """Return a farmer's previously saved farm coordinates, if any."""
    farmer_id = request.args.get("farmer_id", "default")
    saved = location_store.get_location(farmer_id)
    if saved is None:
        return jsonify({"error": "No location saved for this farmer"}), 404

    latitude, longitude = saved
    return jsonify({"farmer_id": farmer_id, "latitude": latitude, "longitude": longitude}), 200


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
