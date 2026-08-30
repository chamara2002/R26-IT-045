"""API routes for disease module forwarding."""

from flask import json
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
    get_heatmap_meta_from_module,
    post_binary_to_module,
    predict_assisted_from_module,
    predict_from_module,
    predict_image_from_module,
    proxy_request_to_module,
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

    try:
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
    except Exception as exc:
        db.session.rollback()
        print(f"[Module Proxy] Warning: Failed to persist detection log for {module_name}: {exc}")


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

    if isinstance(payload, dict) and not payload.get("farmer_id"):
        payload["farmer_id"] = str(user_id)

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
    """Forward an uploaded image and optional clinical/symptom inputs to a selected ML module."""
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    user_id = int(get_jwt_identity())
    cow, error_response = _resolve_cow(user_id, request.form.get("cow_id"))
    if error_response:
        return error_response

    form_fields = dict(request.form)
    if not form_fields.get("farmer_id"):
        form_fields["farmer_id"] = str(user_id)

    extra_files = {}
    if "original_image" in request.files:
        extra_files["original_image"] = request.files["original_image"]
    elif "raw_image" in request.files:
        extra_files["original_image"] = request.files["raw_image"]

    response_body, status_code = predict_assisted_from_module(
        module_name,
        request.files["image"],
        form_fields,
        extra_files=extra_files if extra_files else None,
    )
    if status_code < 400:
        _store_detection_log(user_id, cow.id if cow else None, module_name, response_body, form_fields)
    return jsonify(response_body), status_code


@module_bp.route("/<module_name>/weather/<path:subpath>", methods=["GET", "POST", "PUT", "DELETE"])
@jwt_required(optional=True)
def proxy_module_weather(module_name: str, subpath: str):
    """Proxy weather endpoints (e.g. districts, current-risk, location, history, trend) to target microservice."""
    params = dict(request.args) if request.args else {}
    json_payload = request.get_json(silent=True) if request.is_json else None

    # Auto-fill farmer_id from JWT if user is logged in
    user_id = get_jwt_identity()
    if user_id:
        if not params.get("farmer_id"):
            params["farmer_id"] = str(user_id)
        if isinstance(json_payload, dict) and not json_payload.get("farmer_id"):
            json_payload["farmer_id"] = str(user_id)

    response_body, status_code = proxy_request_to_module(
        module_name,
        f"/weather/{subpath}",
        method=request.method,
        params=params if params else None,
        json_payload=json_payload,
    )
    return jsonify(response_body), status_code



@module_bp.get("/<module_name>/heatmap/<heatmap_id>")
@jwt_required(optional=True)
def get_heatmap(module_name: str, heatmap_id: str):
    """Proxy a generated Grad-CAM heatmap from a selected ML module."""
    params = dict(request.args) if request.args else None
    response_body, status_code, content_type = get_heatmap_from_module(module_name, heatmap_id, params=params)

    if status_code == 200:
        res = Response(response_body, status=200, mimetype=content_type)
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Cache-Control"] = "public, max-age=3600"
        return res

    resp = jsonify(response_body)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp, status_code


@module_bp.get("/<module_name>/heatmap/<heatmap_id>/meta")
@jwt_required(optional=True)
def get_heatmap_meta(module_name: str, heatmap_id: str):
    """Proxy a generated Grad-CAM heatmap metadata from a selected ML module."""
    response_body, status_code = get_heatmap_meta_from_module(module_name, heatmap_id)
    resp = jsonify(response_body)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp, status_code


@module_bp.post("/<module_name>/report-pdf")
@jwt_required(optional=True)
def report_pdf(module_name: str):
    """Proxy a PDF report generation request to a selected ML module."""
    user_id_raw = get_jwt_identity()
    user_id = None
    if user_id_raw is not None:
        try:
            user_id = int(user_id_raw)
        except (ValueError, TypeError):
            pass

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    # If cow_id is present, enrich payload with full cow profile and longitudinal health history
    cow_id_raw = (
        payload.get("cow_id")
        or (payload.get("cattle_info") or {}).get("id")
        or (payload.get("cow") or {}).get("id")
    )
    if cow_id_raw:
        try:
            cow_id = int(cow_id_raw)
            cow_query = Cow.query.filter_by(id=cow_id)
            if user_id:
                cow_query = cow_query.filter_by(user_id=user_id)
            cow = cow_query.first()
            if cow:
                if "cattle_info" not in payload:
                    payload["cattle_info"] = {}
                payload["cattle_info"].update({
                    "id": cow.id,
                    "tag_id": cow.tag_id or "Not recorded",
                    "name": cow.name or "Cow",
                    "breed": cow.breed or "Not recorded",
                    "age": cow.age,
                    "gender": cow.gender or "Female",
                    "lactation_count": cow.lactation_count,
                    "current_lactation": cow.current_lactation,
                    "date_of_birth": cow.date_of_birth.strftime("%Y-%m-%d") if cow.date_of_birth else None,
                    "date_acquired": cow.date_acquired.strftime("%Y-%m-%d") if cow.date_acquired else None,
                    "source": cow.source,
                    "created_at": cow.created_at.strftime("%Y-%m-%d") if cow.created_at else None,
                })
                # Fetch longitudinal health trend
                from services.health_trend_service import calculate_cow_health_trend
                assessments_query = MastitisAssessment.query.filter_by(cow_id=cow.id)
                if user_id:
                    assessments_query = assessments_query.filter_by(user_id=user_id)
                assessments = assessments_query.all()
                trend_data = calculate_cow_health_trend(assessments)
                payload["health_history"] = trend_data
        except Exception as exc:
            print(f"[Report PDF Proxy] Error enriching cow history: {exc}")

    # Set default language if not specified
    if "language" not in payload:
        payload["language"] = "en"

    target_endpoint = "/api/report/generate-pdf" if module_name == "mastitis" else "/api/report/pdf"
    content, status_code, content_type = post_binary_to_module(module_name, target_endpoint, payload)

    if status_code == 200:
        response = Response(content, status=200, mimetype=content_type)
        cow_tag = (payload.get("cattle_info") or {}).get("tag_id") or "Cow"
        lang = payload.get("language", "en")
        response.headers["Content-Disposition"] = f"attachment; filename=CattleSense_{module_name}_report_{cow_tag}_{lang}.pdf"
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    if isinstance(content, (bytes, bytearray)):
        try:
            content = json.loads(content.decode("utf-8"))
        except Exception:
            content = {"error": "Failed to generate report", "details": str(content)}

    resp = jsonify(content)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp, status_code


# ── Disease Assessment History & Persistence Routes ─────────────────────────


@module_bp.post("/<module_name>/assessments")
@jwt_required()
def save_module_assessment(module_name: str):
    """Save an assessment record for any disease module linked to a specific cow profile."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    cow_id_raw = (
        data.get("cow_id")
        or (data.get("cattle_info") or {}).get("id")
        or (data.get("cow") or {}).get("id")
    )
    if not cow_id_raw:
        return jsonify({"error": "cow_id is required"}), 400

    try:
        cow_id = int(cow_id_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "cow_id must be a valid integer"}), 400

    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found or access denied"}), 404

    mod_clean = module_name.lower().replace("_", "-")

    if mod_clean == "mastitis":
        heatmap_id = data.get("heatmap_id")
        if heatmap_id:
            existing = MastitisAssessment.query.filter_by(
                cow_id=cow.id,
                user_id=user_id,
                heatmap_id=str(heatmap_id).strip(),
            ).first()
            if existing:
                return jsonify({
                    "success": True,
                    "message": f"Assessment already saved to {cow.name}'s medical profile",
                    "assessment": existing.to_dict(),
                    "is_duplicate": True,
                }), 200

        # Extract numerical measurements (from numerical_measurements dict or flat fields)
        num_meas = data.get("numerical_measurements") if isinstance(data.get("numerical_measurements"), dict) else {}

        def _extract_num(key_list):
            for k in key_list:
                if k in num_meas and num_meas[k] is not None and num_meas[k] != "":
                    try:
                        return float(num_meas[k])
                    except (ValueError, TypeError):
                        pass
                if k in data and data[k] is not None and data[k] != "":
                    try:
                        return float(data[k])
                    except (ValueError, TypeError):
                        pass
            return None

        def _extract_int(key_list):
            for k in key_list:
                if k in num_meas and num_meas[k] is not None and num_meas[k] != "":
                    try:
                        return int(num_meas[k])
                    except (ValueError, TypeError):
                        pass
                if k in data and data[k] is not None and data[k] != "":
                    try:
                        return int(data[k])
                    except (ValueError, TypeError):
                        pass
            return None

        milk_temp = _extract_num(["Milk_Temperature", "milk_temperature", "milkTemperature", "temperature", "Temperature"])
        milk_ph = _extract_num(["Milk_pH", "milk_ph", "milkPh", "pH", "ph"])
        milk_cond = _extract_num(["Milk_Conductivity", "milk_conductivity", "milkConductivity", "conductivity"])
        milk_yield = _extract_num(["Milk_Yield", "milk_yield", "milkYield", "yield"])
        clotting = _extract_int(["Clotting", "clotting", "milk_clotting", "milkClotting"])

        breed = num_meas.get("Breed") or num_meas.get("breed") or data.get("Breed") or data.get("breed")
        months_after = _extract_int(["Months after giving birth", "months_after_giving_birth", "monthsAfterGivingBirth"])
        prev_status = _extract_int(["Previous_Mastits_status", "previous_mastitis_status", "previousMastitisStatus"])
        body_temp = _extract_num(["Temperature", "temperature", "body_temperature", "bodyTemperature"])

        assessment = MastitisAssessment(
            cow_id=cow.id,
            user_id=user_id,
            prediction=str(data.get("prediction") or "Normal"),
            confidence=float(data["confidence"]) if data.get("confidence") is not None else None,
            stage=data.get("stage"),
            severity_level=data.get("severity_level"),
            severity_code=int(data["severity_code"]) if data.get("severity_code") is not None else None,
            detection_mode=data.get("detection_mode", "assisted"),
            uncertainty_level=data.get("uncertainty_level", "high_confidence"),
            is_borderline=bool(data.get("is_borderline", False)),
            uncertainty_note=data.get("uncertainty_note"),
            roi_applied=bool(data.get("roi_applied", False)),
            image_source=data.get("image_source", "full_image"),
            roi_coordinates=data.get("roi_coordinates"),
            heatmap_id=str(heatmap_id).strip() if heatmap_id else None,
            original_image_path=data.get("original_image_path"),
            cropped_image_path=data.get("cropped_image_path"),
            gradcam_heatmap_path=data.get("gradcam_heatmap_path"),
            gradcam_overlay_path=data.get("gradcam_overlay_path"),
            image_prediction=data.get("image_prediction"),
            numerical_prediction=data.get("numerical_prediction"),
            model_2_used=bool(data.get("model_2_used", False)),
            numerical_model_type=data.get("numerical_model_type"),
            missing_numerical_features=data.get("missing_numerical_features"),
            milk_temperature=milk_temp,
            milk_ph=milk_ph,
            milk_conductivity=milk_cond,
            milk_yield=milk_yield,
            clotting=clotting,
            breed=str(breed).strip() if breed else None,
            months_after_giving_birth=months_after,
            previous_mastitis_status=prev_status,
            temperature=body_temp if body_temp is not None else milk_temp,
            clinical_observations=data.get("clinical_observations"),
            farmer_guidance=data.get("farmer_guidance"),
            recommendation=data.get("recommendation"),
            veterinary_report_path=data.get("veterinary_report_path"),
            has_veterinary_report=bool(data.get("has_veterinary_report", False)),
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Mastitis Assessment successfully saved to {cow.name}'s medical profile",
            "assessment": assessment.to_dict(),
            "is_duplicate": False,
        }), 201

    # For FMD, LSD, Milk Fever — persist structured payload to DetectionLog
    res_data = data.get("result") if isinstance(data.get("result"), dict) else data

    result_str = (
        res_data.get("prediction")
        or res_data.get("stage")
        or res_data.get("predicted_label")
        or res_data.get("risk_level")
        or data.get("prediction")
        or data.get("stage")
        or "Assessed"
    )

    conf_val = res_data.get("confidence_score") if res_data.get("confidence_score") is not None else res_data.get("confidence")
    if conf_val is None:
        conf_val = data.get("confidence_score") if data.get("confidence_score") is not None else data.get("confidence")

    try:
        conf_val = float(str(conf_val).replace("%", "").strip())
        if conf_val > 1.0:
            conf_val = conf_val / 100.0
    except (ValueError, TypeError):
        conf_val = None

    session_payload = {
        "result": res_data,
        "symptoms": data.get("symptoms") or res_data.get("symptoms"),
        "weather_risk": res_data.get("weather_risk"),
        "hybrid_assessment": res_data.get("hybrid_assessment"),
        "recommendation": res_data.get("recommendation") or res_data.get("advice") or data.get("recommendation"),
        "stage": res_data.get("stage") or data.get("stage"),
        "risk_level": res_data.get("risk_level") or data.get("risk_level"),
        "saved_at": datetime.utcnow().isoformat(),
    }

    log = DetectionLog(
        user_id=user_id,
        cow_id=cow.id,
        module_name=mod_clean,
        result=str(result_str),
        confidence=conf_val,
        session_data=session_payload,
    )
    db.session.add(log)
    db.session.commit()

    disease_labels = {
        "fmd": "Foot-and-Mouth Disease (FMD)",
        "lumpy": "Lumpy Skin Disease (LSD)",
        "milk-fever": "Milk Fever",
    }
    disease_display = disease_labels.get(mod_clean, mod_clean.upper())

    return jsonify({
        "success": True,
        "message": f"{disease_display} Assessment successfully saved to {cow.name}'s medical profile",
        "log": log.to_dict(),
        "is_duplicate": False,
    }), 201


@module_bp.get("/mastitis/cows/<int:cow_id>/assessments")
@jwt_required()
def get_cow_mastitis_assessments(cow_id: int):
    """Retrieve historical mastitis assessments for a specific cow, ordered newest first."""
    user_id = int(get_jwt_identity())
    cow = Cow.query.filter_by(id=cow_id, user_id=user_id).first()
    if not cow:
        return jsonify({"error": "Cow not found or access denied"}), 404

    assessments = (
        MastitisAssessment.query.filter_by(cow_id=cow.id, user_id=user_id)
        .order_by(MastitisAssessment.assessment_datetime.desc(), MastitisAssessment.id.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "cow": cow.to_dict(),
        "count": len(assessments),
        "assessments": [a.to_dict() for a in assessments],
    }), 200


@module_bp.get("/mastitis/assessments/<int:assessment_id>")
@jwt_required()
def get_single_mastitis_assessment(assessment_id: int):
    """Retrieve a single saved mastitis assessment by ID."""
    user_id = int(get_jwt_identity())
    assessment = MastitisAssessment.query.filter_by(id=assessment_id, user_id=user_id).first()
    if not assessment:
        return jsonify({"error": "Assessment not found or access denied"}), 404

    return jsonify({
        "success": True,
        "assessment": assessment.to_dict(),
    }), 200
