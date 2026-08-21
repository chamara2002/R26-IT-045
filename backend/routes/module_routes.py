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
    post_binary_to_module,
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

    session_data = payload
    response_data = response_body.get("data")
    if isinstance(response_data, dict):
        extra = {
            key: response_data[key]
            for key in ("annotated_image", "risk_level", "recommendation")
            if key in response_data
        }
        if extra:
            session_data = {**(payload if isinstance(payload, dict) else {}), **extra}

    log = DetectionLog(
        user_id=user_id,
        cow_id=cow_id,
        module_name=module_name,
        result=str(result),
        confidence=confidence,
        session_data=session_data,
    )
    db.session.add(log)
    db.session.commit()


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


@module_bp.post("/<module_name>/report-pdf")
@jwt_required()
def report_pdf(module_name: str):
    """Proxy a PDF report generation request to a selected ML module."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    content, status_code, content_type = post_binary_to_module(module_name, "/api/report/pdf", payload)

    if status_code == 200:
        response = Response(content, status=200, mimetype=content_type)
        response.headers["Content-Disposition"] = "attachment; filename=lsd_detection_report.pdf"
        return response

    return jsonify(content), status_code
