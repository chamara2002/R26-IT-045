"""Authentication API routes."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from auth.validators import (
    clean_phone_number,
    is_valid_phone,
    validate_profile_payload,
    validate_signup_payload,
)
from models import db
from models.user import User
from services.auth_service import hash_password, verify_password

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/signup")
def signup():
    """Register a new farmer account."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or data.get("fullName") or "").strip()
    phone = clean_phone_number(data.get("phone") or data.get("mobileNumber") or "")
    email = (data.get("email") or "").strip().lower() or None
    password = data.get("password") or ""
    farm_name = (data.get("farm_name") or data.get("farmName") or "").strip()
    province = (data.get("province") or "").strip()
    district = (data.get("district") or "").strip()
    ds_division = (data.get("ds_division") or data.get("dsDivision") or "").strip()
    gn_division = (data.get("gn_division") or data.get("gnDivision") or "").strip()
    farm_address = (data.get("farm_address") or data.get("farmAddress") or "").strip()
    cattle_count_raw = data.get("cattle_count") if data.get("cattle_count") is not None else data.get("cattleCount")
    farming_experience = (data.get("farming_experience") or data.get("farmingExperience") or "").strip()

    signup_error = validate_signup_payload(
        name=name,
        phone=phone,
        email=email or "",
        password=password,
        farm_name=farm_name,
        province=province,
        district=district,
        ds_division=ds_division,
        gn_division=gn_division,
        farm_address=farm_address,
        cattle_count=cattle_count_raw,
        farming_experience=farming_experience,
    )
    if signup_error:
        return jsonify({"error": signup_error}), 400

    cattle_count = int(cattle_count_raw)

    existing_phone = User.query.filter_by(phone=phone).first()
    if existing_phone:
        return jsonify({"error": "Mobile number is already registered"}), 409

    if email:
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return jsonify({"error": "Email address is already registered"}), 409

    new_user = User(
        name=name,
        phone=phone,
        email=email,
        password_hash=hash_password(password),
        role="farmer",
        farm_name=farm_name,
        province=province,
        district=district,
        ds_division=ds_division,
        gn_division=gn_division,
        farm_address=farm_address,
        cattle_count=cattle_count,
        farming_experience=farming_experience,
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Signup successful", "user": new_user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    """Authenticate farmer using mobile number or email and issue JWT access token."""
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or data.get("phone") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Mobile number (or email) and password are required"}), 400

    user = None
    if "@" in identifier:
        user = User.query.filter_by(email=identifier.lower()).first()
    else:
        cleaned_phone = clean_phone_number(identifier)
        user = User.query.filter(
            (User.phone == cleaned_phone) | (User.phone == identifier) | (User.email == identifier.lower())
        ).first()

    if not user or not verify_password(user.password_hash, password):
        return jsonify({"error": "Invalid login credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"token": access_token, "user": user.to_dict()}), 200


@auth_bp.get("/profile")
@jwt_required()
def get_profile():
    """Return authenticated farmer profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.put("/profile")
@jwt_required()
def update_profile():
    """Update authenticated farmer profile details."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    phone = clean_phone_number(data.get("phone") or "")
    email = (data.get("email") or "").strip().lower() or None
    password = data.get("password") or ""

    profile_error = validate_profile_payload(name=name, phone=phone, email=email or "")
    if profile_error:
        return jsonify({"error": profile_error}), 400

    if phone:
        existing_phone_owner = User.query.filter(User.phone == phone, User.id != user_id).first()
        if existing_phone_owner:
            return jsonify({"error": "Mobile number is already registered"}), 409
        user.phone = phone

    if email:
        existing_email_owner = User.query.filter(User.email == email, User.id != user_id).first()
        if existing_email_owner:
            return jsonify({"error": "Email is already registered"}), 409
        user.email = email

    user.name = name

    # Optional farm detail updates
    if "farm_name" in data or "farmName" in data:
        user.farm_name = (data.get("farm_name") or data.get("farmName") or "").strip()
    if "province" in data:
        user.province = (data.get("province") or "").strip()
    if "district" in data:
        user.district = (data.get("district") or "").strip()
    if "ds_division" in data or "dsDivision" in data:
        user.ds_division = (data.get("ds_division") or data.get("dsDivision") or "").strip()
    if "gn_division" in data or "gnDivision" in data:
        user.gn_division = (data.get("gn_division") or data.get("gnDivision") or "").strip()
    if "farm_address" in data or "farmAddress" in data:
        user.farm_address = (data.get("farm_address") or data.get("farmAddress") or "").strip()
    if "cattle_count" in data or "cattleCount" in data:
        count_val = data.get("cattle_count") if data.get("cattle_count") is not None else data.get("cattleCount")
        try:
            user.cattle_count = int(count_val) if count_val is not None else user.cattle_count
        except (ValueError, TypeError):
            pass
    if "farming_experience" in data or "farmingExperience" in data:
        user.farming_experience = (data.get("farming_experience") or data.get("farmingExperience") or "").strip()

    if password:
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        user.password_hash = hash_password(password)

    db.session.commit()
    return jsonify({"message": "Profile updated", "user": user.to_dict()}), 200

