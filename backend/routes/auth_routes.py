"""Authentication API routes."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from auth.validators import validate_profile_payload, validate_signup_payload
from models import db
from models.user import User
from services.auth_service import hash_password, verify_password

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/signup")
def signup():
    """Register a new farmer account."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    signup_error = validate_signup_payload(name=name, email=email, password=password)
    if signup_error:
        return jsonify({"error": signup_error}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 409

    new_user = User(name=name, email=email, password_hash=hash_password(password))
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Signup successful", "user": new_user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    """Authenticate farmer and issue JWT access token."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

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
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    profile_error = validate_profile_payload(name=name, email=email)
    if profile_error:
        return jsonify({"error": profile_error}), 400

    existing_email_owner = User.query.filter(User.email == email, User.id != user_id).first()
    if existing_email_owner:
        return jsonify({"error": "Email already registered"}), 409

    user.name = name
    user.email = email

    if password:
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        user.password_hash = hash_password(password)

    db.session.commit()
    return jsonify({"message": "Profile updated", "user": user.to_dict()}), 200
