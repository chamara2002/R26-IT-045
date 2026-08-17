"""Cow and milk log API routes with comprehensive validation."""

from datetime import datetime, date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from models import db
from models.cow import Cow
from models.detection_log import DetectionLog
from models.mastitis_assessment import MastitisAssessment
from models.milk_yield import MilkYield

cow_bp = Blueprint("cow", __name__, url_prefix="/api")


def parse_date(date_str, field_name="Date"):
    """Parse YYYY-MM-DD date string or return error message."""
    if not date_str:
        return None, None
    try:
        parsed = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
        return parsed, None
    except ValueError:
        return None, f"{field_name} must use YYYY-MM-DD format"


def calculate_age_years(dob: date) -> int:
    """Calculate age in whole completed years from Date of Birth."""
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return max(0, age)


@cow_bp.post("/cows")
@jwt_required()
def add_cow():
    """Register a new cow for the authenticated farmer."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    # 1. Cow ID / Tag Number (Required)
    tag_id = (
        data.get("tag_id")
        or data.get("tagNumber")
        or data.get("cow_id")
        or data.get("name")
        or ""
    ).strip()

    if not tag_id:
        return jsonify({"error": "Cow ID / Tag Number is required"}), 400

    # Uniqueness check: Do not allow duplicate Cow IDs for the same farmer
    existing_cow = Cow.query.filter(
        Cow.user_id == user_id,
        or_(Cow.tag_id == tag_id, Cow.name == tag_id)
    ).first()

    if existing_cow:
        return jsonify({
            "error": f"Cow ID / Tag Number '{tag_id}' already exists in your herd. Please choose a unique Tag Number."
        }), 409

    # 2. Cow Name (Optional)
    name = (data.get("name") or data.get("cowName") or tag_id).strip()

    # 3. Breed (Optional)
    breed = (data.get("breed") or "").strip() or "Other"

    # 4. Date of Birth / Age (Required)
    dob_raw = data.get("date_of_birth") or data.get("dob") or data.get("dateOfBirth")
    parsed_dob = None
    age = None

    if dob_raw:
        parsed_dob, dob_err = parse_date(dob_raw, "Date of Birth")
        if dob_err:
            return jsonify({"error": dob_err}), 400
        if parsed_dob > date.today():
            return jsonify({"error": "Date of Birth cannot be in the future"}), 400
        age = calculate_age_years(parsed_dob)
    elif "age" in data and data.get("age") not in (None, ""):
        # Legacy age input fallback
        try:
            age = int(data["age"])
            if age < 0:
                return jsonify({"error": "Age cannot be negative"}), 400
            # Approximate DOB
            today = date.today()
            parsed_dob = date(today.year - age, today.month, min(today.day, 28))
        except (ValueError, TypeError):
            return jsonify({"error": "Age must be a valid number"}), 400
    else:
        return jsonify({"error": "Date of Birth / Age is required"}), 400

    # 5. Gender (Required: Female | Male)
    gender_raw = (data.get("gender") or "Female").strip().capitalize()
    if gender_raw not in ("Female", "Male"):
        return jsonify({"error": "Gender must be 'Female' or 'Male'"}), 400
    gender = gender_raw

    # 6. Number of Lactations (Optional, ≥ 0)
    lactation_count = 0
    raw_lactation_count = data.get("lactation_count") if "lactation_count" in data else data.get("numberOfLactations")
    if raw_lactation_count not in (None, ""):
        try:
            lactation_count = int(raw_lactation_count)
            if lactation_count < 0:
                return jsonify({"error": "Number of Lactations must be a non-negative whole number (≥ 0)"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Number of Lactations must be a valid whole number"}), 400

    # 7. Current Lactation Number (Optional, ≥ 1)
    current_lactation = None
    raw_current_lactation = data.get("current_lactation") if "current_lactation" in data else data.get("currentLactationNumber")
    if raw_current_lactation not in (None, ""):
        try:
            current_lactation = int(raw_current_lactation)
            if current_lactation < 1:
                return jsonify({"error": "Current Lactation Number must be a positive whole number (≥ 1)"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Current Lactation Number must be a valid positive whole number"}), 400

    # Logical consistency: Current Lactation Number must not be greater than Number of Lactations (when both are provided)
    if current_lactation is not None and raw_lactation_count not in (None, ""):
        if current_lactation > lactation_count:
            return jsonify({
                "error": f"Current Lactation Number ({current_lactation}) cannot be greater than Total Number of Lactations ({lactation_count})"
            }), 400

    # 8. Date Acquired (Optional, ≤ today)
    date_acquired = None
    raw_acquired = data.get("date_acquired") or data.get("dateAcquired")
    if raw_acquired:
        date_acquired, acq_err = parse_date(raw_acquired, "Date Acquired")
        if acq_err:
            return jsonify({"error": acq_err}), 400
        if date_acquired > date.today():
            return jsonify({"error": "Date Acquired cannot be in the future"}), 400

    # 9. Source (Optional: Born on Farm | Purchased | Other)
    source = (data.get("source") or "").strip()
    source_details = (data.get("source_details") or data.get("specifySource") or "").strip()

    if source:
        valid_sources = ["Born on Farm", "Purchased", "Other"]
        if source not in valid_sources:
            return jsonify({"error": "Source must be 'Born on Farm', 'Purchased', or 'Other'"}), 400

        if source == "Other" and not source_details:
            return jsonify({"error": "Please specify the source when 'Other' is selected"}), 400

    # Create new Cow entity
    cow = Cow(
        user_id=user_id,
        tag_id=tag_id,
        name=name,
        breed=breed,
        date_of_birth=parsed_dob,
        age=age,
        gender=gender,
        lactation_count=lactation_count,
        current_lactation=current_lactation,
        date_acquired=date_acquired,
        source=source or None,
        source_details=source_details or None,
    )

    db.session.add(cow)
    db.session.commit()

    return jsonify({
        "message": f"Cow '{tag_id}' registered successfully",
        "cow": cow.to_dict()
    }), 201


@cow_bp.get("/cows")
@jwt_required()
def get_cows():
    """List all cows owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cows = Cow.query.filter_by(user_id=user_id).order_by(Cow.created_at.desc()).all()
    return jsonify({"cows": [cow.to_dict() for cow in cows]}), 200


@cow_bp.get("/cows/<int:cow_id>")
@jwt_required()
def get_cow(cow_id: int):
    """Retrieve details for a specific cow owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404
    return jsonify({"cow": cow.to_dict()}), 200


@cow_bp.put("/cows/<int:cow_id>")
@jwt_required()
def update_cow(cow_id: int):
    """Update details for one cow owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    data = request.get_json(silent=True) or {}

    # Tag ID update with uniqueness check
    if "tag_id" in data or "tagNumber" in data:
        new_tag = (data.get("tag_id") or data.get("tagNumber") or "").strip()
        if not new_tag:
            return jsonify({"error": "Cow ID / Tag Number cannot be empty"}), 400

        existing = Cow.query.filter(
            Cow.user_id == user_id,
            Cow.id != cow_id,
            or_(Cow.tag_id == new_tag, Cow.name == new_tag)
        ).first()
        if existing:
            return jsonify({
                "error": f"Cow ID / Tag Number '{new_tag}' already belongs to another cow in your herd"
            }), 409
        cow.tag_id = new_tag

    if "name" in data or "cowName" in data:
        cow.name = (data.get("name") or data.get("cowName") or "").strip()

    if "breed" in data:
        cow.breed = (data.get("breed") or "").strip()

    # DOB / Age update
    dob_raw = data.get("date_of_birth") or data.get("dob") or data.get("dateOfBirth")
    if dob_raw:
        parsed_dob, dob_err = parse_date(dob_raw, "Date of Birth")
        if dob_err:
            return jsonify({"error": dob_err}), 400
        if parsed_dob > date.today():
            return jsonify({"error": "Date of Birth cannot be in the future"}), 400
        cow.date_of_birth = parsed_dob
        cow.age = calculate_age_years(parsed_dob)
    elif "age" in data and data.get("age") not in (None, ""):
        try:
            parsed_age = int(data["age"])
            if parsed_age < 0:
                return jsonify({"error": "Age cannot be negative"}), 400
            cow.age = parsed_age
        except (ValueError, TypeError):
            return jsonify({"error": "Age must be a valid number"}), 400

    if "gender" in data and data.get("gender"):
        gender_val = str(data["gender"]).strip().capitalize()
        if gender_val in ("Female", "Male"):
            cow.gender = gender_val

    # Lactation count update
    raw_lactation = data.get("lactation_count") if "lactation_count" in data else data.get("numberOfLactations")
    if raw_lactation not in (None, ""):
        try:
            parsed_lac = int(raw_lactation)
            if parsed_lac < 0:
                return jsonify({"error": "Number of Lactations must be ≥ 0"}), 400
            cow.lactation_count = parsed_lac
        except (ValueError, TypeError):
            return jsonify({"error": "Number of Lactations must be a valid number"}), 400

    # Current lactation update
    raw_current = data.get("current_lactation") if "current_lactation" in data else data.get("currentLactationNumber")
    if raw_current not in (None, ""):
        try:
            parsed_cur = int(raw_current)
            if parsed_cur < 1:
                return jsonify({"error": "Current Lactation Number must be ≥ 1"}), 400
            cow.current_lactation = parsed_cur
        except (ValueError, TypeError):
            return jsonify({"error": "Current Lactation Number must be a valid number"}), 400

    # Consistency check
    if cow.current_lactation is not None and cow.lactation_count is not None:
        if cow.current_lactation > cow.lactation_count:
            return jsonify({
                "error": f"Current Lactation Number ({cow.current_lactation}) cannot be greater than Total Number of Lactations ({cow.lactation_count})"
            }), 400

    # Date Acquired update
    raw_acq = data.get("date_acquired") or data.get("dateAcquired")
    if raw_acq is not None:
        if raw_acq == "":
            cow.date_acquired = None
        else:
            date_acq, acq_err = parse_date(raw_acq, "Date Acquired")
            if acq_err:
                return jsonify({"error": acq_err}), 400
            if date_acq > date.today():
                return jsonify({"error": "Date Acquired cannot be in the future"}), 400
            cow.date_acquired = date_acq

    if "source" in data:
        src = (data.get("source") or "").strip()
        if src and src not in ["Born on Farm", "Purchased", "Other"]:
            return jsonify({"error": "Source must be 'Born on Farm', 'Purchased', or 'Other'"}), 400
        cow.source = src or None

    if "source_details" in data or "specifySource" in data:
        details = (data.get("source_details") or data.get("specifySource") or "").strip()
        if cow.source == "Other" and not details:
            return jsonify({"error": "Please specify the source when 'Other' is selected"}), 400
        cow.source_details = details or None

    db.session.commit()
    return jsonify({"message": "Cow updated successfully", "cow": cow.to_dict()}), 200


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
    return jsonify({"message": "Cow deleted successfully"}), 200


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

    # Compare today's yield against recent average for anomaly alerts
    recent_logs = (
        MilkYield.query.filter(MilkYield.cow_id == cow.id, MilkYield.date < milk_log.date)
        .order_by(MilkYield.date.desc())
        .limit(7)
        .all()
    )

    alert = None
    if recent_logs:
        avg_yield = sum(log.milk_quantity for log in recent_logs) / len(recent_logs)
        drop_threshold = avg_yield * Decimal("0.8")
        if milk_quantity_decimal < drop_threshold:
            alert = f"Significant milk yield drop detected for {cow.tag_id or cow.name} ({float(milk_quantity_decimal):.2f}L vs 7-day avg {float(avg_yield):.2f}L)."

    return jsonify({
        "message": "Milk yield recorded",
        "milk_yield": milk_log.to_dict(),
        "alert": alert,
    }), 201


@cow_bp.get("/milk-yield")
@jwt_required()
def get_milk_yield():
    """List milk yield logs for all cows owned by the authenticated user."""
    user_id = int(get_jwt_identity())
    logs = (
        MilkYield.query.join(Cow, Cow.id == MilkYield.cow_id)
        .filter(Cow.user_id == user_id)
        .order_by(MilkYield.date.desc())
        .all()
    )
    return jsonify({"milk_yield": [log.to_dict() for log in logs]}), 200


@cow_bp.get("/cows/<int:cow_id>/records")
@jwt_required()
def get_cow_records(cow_id: int):
    """Return health checks and milk yield logs for a specific cow."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    milk_records = (
        MilkYield.query.filter_by(cow_id=cow.id)
        .order_by(MilkYield.date.desc())
        .all()
    )

    detection_records = (
        DetectionLog.query.filter_by(cow_id=cow.id, user_id=user_id)
        .order_by(DetectionLog.created_at.desc())
        .all()
    )

    mastitis_assessments = (
        MastitisAssessment.query.filter_by(cow_id=cow.id, user_id=user_id)
        .order_by(MastitisAssessment.assessment_datetime.desc(), MastitisAssessment.id.desc())
        .all()
    )

    total_milk = sum(float(log.milk_quantity) for log in milk_records)
    avg_milk = (total_milk / len(milk_records)) if milk_records else 0.0

    return jsonify({
        "cow": cow.to_dict(),
        "summary": {
            "milk_records": len(milk_records),
            "milk_total": round(total_milk, 2),
            "milk_average": round(avg_milk, 2),
            "health_checks": len(detection_records),
            "mastitis_assessments": len(mastitis_assessments),
        },
        "milk_yield": [log.to_dict() for log in milk_records],
        "detection_logs": [log.to_dict() for log in detection_records],
        "mastitis_assessments": [a.to_dict() for a in mastitis_assessments],
    }), 200


@cow_bp.get("/cows/<int:cow_id>/milk-logs/latest")
@jwt_required()
def get_latest_cow_milk_log(cow_id: int):
    """Return the latest valid milk yield log for a specific cow."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found"}), 404

    latest_log = (
        MilkYield.query.filter_by(cow_id=cow.id)
        .order_by(MilkYield.date.desc(), MilkYield.created_at.desc())
        .first()
    )

    if not latest_log:
        return jsonify({
            "cow_id": cow.id,
            "message": "No milk record available for this cow",
            "latest_record": None,
        }), 200

    return jsonify({
        "cow_id": cow.id,
        "message": "Latest milk record found",
        "latest_record": latest_log.to_dict(),
    }), 200

