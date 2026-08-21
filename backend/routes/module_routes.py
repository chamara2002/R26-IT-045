"""API routes for disease module forwarding."""

from flask import Blueprint, jsonify, request
from flask import Response
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.cow import Cow
from models.detection_log import DetectionLog
from models.mastitis_assessment import MastitisAssessment

from services.module_proxy_service import (
    generate_report_from_module,
    get_heatmap_from_module,
    predict_assisted_from_module,
    predict_from_module,
    predict_image_from_module,
)

module_bp = Blueprint("module", __name__, url_prefix="/api/modules")


def _resolve_cow(user_id: int, cow_id_raw):
    if cow_id_raw in (None, ""):
        return None, None

    try:
        cow_id = int(cow_id_raw)
    except (TypeError, ValueError):
        return None, (jsonify({"error": "cow_id must be a number"}), 400)

    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return None, (jsonify({"error": "Cow not found"}), 404)

    return cow, None


def _extract_detection_result(response_body: dict):
    data = response_body.get("data") if isinstance(response_body, dict) else None
    if isinstance(data, dict):
        result = data.get("prediction") or data.get("stage") or data.get("disease")
        confidence = data.get("confidence")
        if confidence is None and isinstance(data.get("overall_prediction"), dict):
            confidence = data["overall_prediction"].get("confidence")
        return result, confidence

    result = response_body.get("stage") or response_body.get("prediction") or response_body.get("disease")
    confidence = response_body.get("confidence")
    return result, confidence


def _store_detection_log(user_id: int, cow_id: int | None, module_name: str, response_body: dict, payload: dict):
    if cow_id is None or not isinstance(response_body, dict):
        return

    result, confidence = _extract_detection_result(response_body)
    if not result:
        result = "unknown"

    if confidence is not None:
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = None

    try:
        log = DetectionLog(
            user_id=user_id,
            cow_id=cow_id,
            module_name=module_name,
            result=str(result),
            confidence=confidence,
            session_data={
                "response": response_body,
                "inputs": {k: v for k, v in payload.items() if k != "image"},
            },
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error storing detection log: {e}")


@module_bp.post("/<module_name>/predict")
@jwt_required()
def predict(module_name: str):
    """Forward prediction request to a selected independent ML module."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    user_id = int(get_jwt_identity())
    cow, error_response = _resolve_cow(user_id, payload.get("cow_id") if isinstance(payload, dict) else None)
    if error_response:
        return error_response

    response_body, status_code = predict_from_module(module_name, payload)
    if status_code < 400:
        _store_detection_log(user_id, cow.id if cow else None, module_name, response_body, payload)
    return jsonify(response_body), status_code


@module_bp.post("/<module_name>/predict-image")
@jwt_required()
def predict_image(module_name: str):
    """Forward an uploaded image to a selected ML module."""
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    user_id = int(get_jwt_identity())
    cow, error_response = _resolve_cow(user_id, request.form.get("cow_id"))
    if error_response:
        return error_response

    response_body, status_code = predict_image_from_module(module_name, request.files["image"])
    if status_code < 400:
        _store_detection_log(user_id, cow.id if cow else None, module_name, response_body, dict(request.form))
    return jsonify(response_body), status_code


@module_bp.post("/<module_name>/predict-assisted")
@jwt_required()
def predict_assisted(module_name: str):
    """Forward an uploaded image and optional mastitis inputs to a selected ML module."""
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    user_id = int(get_jwt_identity())
    cow, error_response = _resolve_cow(user_id, request.form.get("cow_id"))
    if error_response:
        return error_response

    extra_files = {}
    if "original_image" in request.files:
        extra_files["original_image"] = request.files["original_image"]
    elif "raw_image" in request.files:
        extra_files["original_image"] = request.files["raw_image"]

    response_body, status_code = predict_assisted_from_module(
        module_name,
        request.files["image"],
        dict(request.form),
        extra_files=extra_files if extra_files else None,
    )
    if status_code < 400:
        _store_detection_log(user_id, cow.id if cow else None, module_name, response_body, dict(request.form))
    return jsonify(response_body), status_code


@module_bp.get("/<module_name>/heatmap/<heatmap_id>")
@jwt_required()
def get_heatmap(module_name: str, heatmap_id: str):
    """Proxy a generated Grad-CAM heatmap from a selected ML module."""
    response_body, status_code, content_type = get_heatmap_from_module(module_name, heatmap_id)

    if status_code == 200:
        return Response(response_body, status=200, mimetype=content_type)

    return jsonify(response_body), status_code


@module_bp.post("/<module_name>/report/pdf")
@jwt_required(optional=True)
def generate_module_report_pdf(module_name: str):
    """Proxy report PDF generation to the ML module."""
    payload = request.get_json(silent=True) or {}
    user_id = get_jwt_identity()
    if user_id:
        try:
            from models.user import User
            user = User.query.get(int(user_id))
            if user and "farmer_info" not in payload:
                payload["farmer_info"] = {
                    "name": user.name,
                    "farm_name": user.farm_name,
                    "district": user.district or user.province,
                    "phone": user.phone,
                }
        except Exception:
            pass

    response_body, status_code, content_type = generate_report_from_module(module_name, payload)
    if status_code == 200:
        return Response(
            response_body,
            status=200,
            mimetype=content_type,
            headers={"Content-Disposition": "attachment; filename=CattleSense-Veterinary-Report.pdf"}
        )

    return jsonify(response_body), status_code


# ── Optional Mastitis Assessment Persistence (Cow Profile History) ────────────

@module_bp.post("/mastitis/assessments")
@jwt_required()
def save_mastitis_assessment():
    """Optionally save a completed mastitis assessment to the selected cow's profile."""
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}

    cow_id_raw = payload.get("cow_id")
    if not cow_id_raw:
        return jsonify({"error": "cow_id is required to link assessment to a cow profile"}), 400

    try:
        cow_id = int(cow_id_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "cow_id must be an integer"}), 400

    # Ensure the cow exists and belongs to the authenticated farmer
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found or does not belong to your account"}), 404

    # Extract prediction data
    prediction = str(payload.get("prediction") or "Normal").strip()
    confidence = payload.get("confidence")
    if confidence is not None:
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = None

    stage = payload.get("stage") or "No Mastitis"
    severity_level = payload.get("severity_level") or (
        payload.get("severity", {}).get("severity_level") if isinstance(payload.get("severity"), dict) else "negative"
    )
    severity_code = payload.get("severity_code") or (
        payload.get("severity", {}).get("severity_code") if isinstance(payload.get("severity"), dict) else 0
    )

    heatmap_id = payload.get("heatmap_id")

    # Duplicate save prevention: check if this heatmap_id or recent identical assessment was already saved
    if heatmap_id:
        existing = MastitisAssessment.query.filter_by(
            cow_id=cow_id,
            user_id=user_id,
            heatmap_id=heatmap_id
        ).first()
        if existing:
            return jsonify({
                "success": True,
                "message": "Assessment already saved",
                "assessment": existing.to_dict(),
                "is_duplicate": True,
            }), 200

    # Extract numerical clinical inputs
    num_measurements = payload.get("numerical_measurements") or {}
    if not isinstance(num_measurements, dict):
        num_measurements = {}

    def _parse_float_or_none(val):
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    def _parse_int_or_none(val):
        if val is None or val == "":
            return None
        try:
            return int(val)
        except (TypeError, ValueError):
            return None

    # New 5 Model 2 features
    milk_temp_val = _parse_float_or_none(
        num_measurements.get("Milk_Temperature")
        if num_measurements.get("Milk_Temperature") is not None
        else num_measurements.get("milk_temperature")
    )
    milk_ph_val = _parse_float_or_none(
        num_measurements.get("Milk_pH")
        if num_measurements.get("Milk_pH") is not None
        else num_measurements.get("milk_ph")
    )
    milk_cond_val = _parse_float_or_none(
        num_measurements.get("Milk_Conductivity")
        if num_measurements.get("Milk_Conductivity") is not None
        else num_measurements.get("milk_conductivity")
    )
    milk_yield_val = _parse_float_or_none(
        num_measurements.get("Milk_Yield")
        if num_measurements.get("Milk_Yield") is not None
        else num_measurements.get("milk_yield")
    )
    clotting_val = _parse_int_or_none(
        num_measurements.get("Clotting")
        if num_measurements.get("Clotting") is not None
        else num_measurements.get("clotting")
    )

    # Legacy fields
    breed_val = num_measurements.get("Breed") or num_measurements.get("breed")
    months_val = _parse_int_or_none(
        num_measurements.get("Months after giving birth")
        if num_measurements.get("Months after giving birth") is not None
        else num_measurements.get("months_after_giving_birth")
    )
    prev_status_val = _parse_int_or_none(
        num_measurements.get("Previous_Mastits_status")
        if num_measurements.get("Previous_Mastits_status") is not None
        else (
            num_measurements.get("Previous_Mastitis_status")
            if num_measurements.get("Previous_Mastitis_status") is not None
            else num_measurements.get("previous_mastitis_status")
        )
    )
    temp_val = _parse_float_or_none(
        num_measurements.get("Temperature")
        if num_measurements.get("Temperature") is not None
        else num_measurements.get("temperature")
    )
    if milk_temp_val is None and temp_val is not None:
        milk_temp_val = temp_val

    # Create assessment record
    try:
        assessment = MastitisAssessment(
            cow_id=cow_id,
            user_id=user_id,
            prediction=prediction,
            confidence=confidence,
            stage=stage,
            severity_level=str(severity_level),
            severity_code=int(severity_code) if severity_code is not None else 0,
            detection_mode=payload.get("detection_mode") or payload.get("mode") or "assisted",
            roi_applied=bool(payload.get("roi_applied", False)),
            image_source=str(payload.get("image_source", "full_image")),
            roi_coordinates=payload.get("roi_coordinates"),
            heatmap_id=heatmap_id,
            original_image_path=payload.get("original_image_path"),
            cropped_image_path=payload.get("cropped_image_path"),
            gradcam_heatmap_path=payload.get("gradcam_heatmap_path"),
            gradcam_overlay_path=payload.get("gradcam_overlay_path"),
            image_prediction=payload.get("image_prediction"),
            numerical_prediction=payload.get("numerical_prediction"),
            model_2_used=bool(payload.get("model_2_used", False)),
            numerical_model_type=payload.get("numerical_model_type") or ("Decision Tree (Model 2)" if payload.get("model_2_used") else None),
            missing_numerical_features=payload.get("missing_numerical_features") or [],
            milk_temperature=milk_temp_val,
            milk_ph=milk_ph_val,
            milk_conductivity=milk_cond_val,
            milk_yield=milk_yield_val,
            clotting=clotting_val,
            breed=str(breed_val).strip() if breed_val else None,
            months_after_giving_birth=months_val,
            previous_mastitis_status=prev_status_val,
            temperature=temp_val or milk_temp_val,
            clinical_observations=payload.get("clinical_observations") or {},
            farmer_guidance=payload.get("farmer_guidance"),
            recommendation=payload.get("recommendation"),
            veterinary_report_path=payload.get("veterinary_report_path"),
            has_veterinary_report=bool(payload.get("has_veterinary_report", False) or str(severity_level).lower() in ("severe", "critical")),
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Assessment successfully saved to {cow.name or f'Cow #{cow.id}'}'s history",
            "assessment": assessment.to_dict(),
            "is_duplicate": False,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save assessment: {str(e)}"}), 500


@module_bp.get("/mastitis/cows/<int:cow_id>/assessments")
@jwt_required()
def get_cow_mastitis_assessments(cow_id: int):
    """Retrieve saved mastitis assessments for a specific cow (newest first)."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found or does not belong to your account"}), 404

    assessments = (
        MastitisAssessment.query.filter_by(cow_id=cow_id, user_id=user_id)
        .order_by(MastitisAssessment.assessment_datetime.desc(), MastitisAssessment.id.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "cow": {
            "id": cow.id,
            "name": cow.name,
            "tag_id": cow.tag_id,
            "breed": cow.breed,
        },
        "count": len(assessments),
        "assessments": [a.to_dict() for a in assessments],
    }), 200


@module_bp.get("/mastitis/assessments/<int:assessment_id>")
@jwt_required()
def get_single_mastitis_assessment(assessment_id: int):
    """View details of a single saved mastitis assessment (with ownership verification)."""
    user_id = int(get_jwt_identity())
    assessment = MastitisAssessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({"error": "Assessment record not found"}), 404

    return jsonify({
        "success": True,
        "assessment": assessment.to_dict(),
    }), 200
