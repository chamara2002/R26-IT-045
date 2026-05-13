"""Cow and milk log API routes."""

from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.cow import Cow
from models.detection_log import DetectionLog
from models.milk_yield import MilkYield

cow_bp = Blueprint("cow", __name__, url_prefix="/api")


@cow_bp.post("/cows")
@jwt_required()
def add_cow():
    """Add a new cow for the authenticated user."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    required_fields = ["name", "breed", "age", "lactation_count"]
    missing = [field for field in required_fields if data.get(field) in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        age = int(data["age"])
        lactation_count = int(data["lactation_count"])
    except (TypeError, ValueError):
        return jsonify({"error": "age and lactation_count must be numbers"}), 400

    cow = Cow(
        user_id=user_id,
        name=str(data["name"]).strip(),
        breed=str(data["breed"]).strip(),
        age=age,
        lactation_count=lactation_count,
    )

    db.session.add(cow)
    db.session.commit()

    return jsonify({"message": "Cow added", "cow": cow.to_dict()}), 201


@cow_bp.get("/cows")
@jwt_required()
def get_cows():
    """List all cows owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cows = Cow.query.filter_by(user_id=user_id).order_by(Cow.created_at.desc()).all()
    return jsonify({"cows": [cow.to_dict() for cow in cows]}), 200


@cow_bp.put("/cows/<int:cow_id>")
@jwt_required()
def update_cow(cow_id: int):
    """Update details for one cow owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    breed = (data.get("breed") or "").strip()
    age = data.get("age")
    lactation_count = data.get("lactation_count")

    if not name or not breed or age in (None, "") or lactation_count in (None, ""):
        return jsonify({"error": "Please fill all fields"}), 400

    try:
        parsed_age = int(age)
        parsed_lactation_count = int(lactation_count)
    except (TypeError, ValueError):
        return jsonify({"error": "Age and lactation count must be numbers"}), 400

    if parsed_age < 0 or parsed_lactation_count < 0:
        return jsonify({"error": "Age and lactation count must be 0 or greater"}), 400

    cow.name = name
    cow.breed = breed
    cow.age = parsed_age
    cow.lactation_count = parsed_lactation_count

    db.session.commit()
    return jsonify({"message": "Cow updated", "cow": cow.to_dict()}), 200


@cow_bp.delete("/cows/<int:cow_id>")
@jwt_required()
def delete_cow(cow_id: int):
    """Delete one cow owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    db.session.delete(cow)
    db.session.commit()
    return jsonify({"message": "Cow deleted"}), 200


@cow_bp.post("/milk-yield")
@jwt_required()
def add_milk_yield():
    """Add daily milk yield record for a user's cow."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    cow_id = data.get("cow_id")
    milk_quantity = data.get("milk_quantity")
    date_raw = data.get("date")

    if not cow_id or milk_quantity in (None, ""):
        return jsonify({"error": "cow_id and milk_quantity are required"}), 400

    cow = Cow.query.filter_by(id=int(cow_id), user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    try:
        log_date = datetime.strptime(date_raw, "%Y-%m-%d").date() if date_raw else datetime.utcnow().date()
    except ValueError:
        return jsonify({"error": "date must use YYYY-MM-DD format"}), 400

    try:
        milk_quantity_decimal = Decimal(str(milk_quantity))
    except (InvalidOperation, TypeError, ValueError):
        return jsonify({"error": "milk_quantity must be a valid number"}), 400

    milk_log = MilkYield(
        cow_id=cow.id,
        date=log_date,
        milk_quantity=milk_quantity_decimal,
    )
    db.session.add(milk_log)
    db.session.commit()

    # Simple anomaly detection: compare today's yield against recent average
    # Compute average of previous 7 days (if available)
    recent_logs = (
        MilkYield.query.filter(MilkYield.cow_id == cow.id, MilkYield.date < milk_log.date)
        .order_by(MilkYield.date.desc())
        .limit(7)
        .all()
    )
    alert = None
    try:
        if recent_logs:
            recent_total = sum(float(log.milk_quantity) for log in recent_logs)
            recent_avg = recent_total / len(recent_logs)
            # If today's yield drops more than 30% from recent average, flag for mastitis check
            if recent_avg > 0 and float(milk_log.milk_quantity) < recent_avg * 0.7:
                alert = "Significant drop in milk yield detected — please check for mastitis."
        else:
            # If no recent history but yield is very low, warn as precaution
            if float(milk_log.milk_quantity) <= 1.0:
                alert = "Low milk yield recorded — consider checking for mastitis."
    except Exception:
        alert = None

    response = {"message": "Milk yield logged", "milk_yield": milk_log.to_dict()}
    if alert:
        response["alert"] = alert

    return jsonify(response), 201


@cow_bp.get("/milk-yield")
@jwt_required()
def get_milk_yield_history():
    """Return milk yield history for all cows owned by authenticated user."""
    user_id = int(get_jwt_identity())
    cow_ids = [cow.id for cow in Cow.query.filter_by(user_id=user_id).all()]

    if not cow_ids:
        return jsonify({"milk_yield": []}), 200

    logs = (
        MilkYield.query.filter(MilkYield.cow_id.in_(cow_ids))
        .order_by(MilkYield.date.asc(), MilkYield.created_at.asc())
        .all()
    )

    return jsonify({"milk_yield": [log.to_dict() for log in logs]}), 200


@cow_bp.get("/cows/<int:cow_id>/records")
@jwt_required()
def get_cow_records(cow_id: int):
    """Return milk yield and health history for one cow owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    milk_logs = (
        MilkYield.query.filter_by(cow_id=cow.id)
        .order_by(MilkYield.date.desc(), MilkYield.created_at.desc())
        .all()
    )
    detection_logs = (
        DetectionLog.query.filter_by(cow_id=cow.id)
        .order_by(DetectionLog.created_at.desc())
        .all()
    )

    milk_total = sum(float(log.milk_quantity) for log in milk_logs)
    milk_average = milk_total / len(milk_logs) if milk_logs else 0.0
    latest_detection = detection_logs[0] if detection_logs else None

    return jsonify(
        {
            "cow": cow.to_dict(),
            "summary": {
                "milk_records": len(milk_logs),
                "milk_total": round(milk_total, 2),
                "milk_average": round(milk_average, 2),
                "health_checks": len(detection_logs),
                "latest_health_check": latest_detection.created_at.isoformat() if latest_detection else None,
                "latest_health_result": latest_detection.result if latest_detection else None,
            },
            "milk_yield": [log.to_dict() for log in milk_logs],
            "detection_logs": [log.to_dict() for log in detection_logs],
        }
    ), 200
