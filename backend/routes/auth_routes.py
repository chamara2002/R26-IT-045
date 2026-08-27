import secrets
from datetime import datetime, timedelta
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
from models.password_reset_otp import PasswordResetOTP
from services.auth_service import hash_password, verify_password
from services.resend_service import send_password_reset_email

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


# ── Password Recovery & Email OTP Endpoints ────────────────────────────────────

GENERIC_FORGOT_PASSWORD_RESPONSE = (
    "If an account exists for this email, a verification code has been sent."
)


@auth_bp.post("/forgot-password")
def request_forgot_password_otp():
    """
    Request a 6-digit verification code sent via Resend.
    Protected with email-enumeration suppression and rate-limiting.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400

    user = User.query.filter(User.email.ilike(email)).first()
    if not user:
        return (
            jsonify(
                {
                    "error": "No account found with this email address. Please check your email or create an account."
                }
            ),
            404,
        )

    now = datetime.utcnow()

    # Rate limiting: 1 request per 60 seconds
    sixty_seconds_ago = now - timedelta(seconds=60)
    recent_otp = (
        PasswordResetOTP.query.filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.created_at >= sixty_seconds_ago,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )
    if recent_otp:
        return (
            jsonify(
                {
                    "error": "A verification code was recently sent. Please wait 60 seconds before requesting a new code."
                }
            ),
            429,
        )

    # Rate limiting: max 3 requests within 15 minutes
    fifteen_mins_ago = now - timedelta(minutes=15)
    recent_count = PasswordResetOTP.query.filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.created_at >= fifteen_mins_ago,
    ).count()
    if recent_count >= 3:
        return (
            jsonify(
                {
                    "error": "Too many code requests. Please wait 15 minutes before requesting another code."
                }
            ),
            429,
        )

    # Invalidate previous unverified/unused OTPs for this user
    prior_otps = PasswordResetOTP.query.filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.is_used == False,
    ).all()
    for p in prior_otps:
        p.is_used = True

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_hash = hash_password(otp_code)
    expires_at = now + timedelta(minutes=5)

    otp_record = PasswordResetOTP(
        user_id=user.id,
        email=user.email,
        otp_hash=otp_hash,
        attempts=0,
        is_verified=False,
        is_used=False,
        expires_at=expires_at,
        created_at=now,
    )
    db.session.add(otp_record)
    db.session.commit()

    # Dispatch email via Resend (never log or leak the OTP code)
    send_password_reset_email(to_email=user.email, otp_code=otp_code, recipient_name=user.name)

    return jsonify({"message": GENERIC_FORGOT_PASSWORD_RESPONSE}), 200


@auth_bp.post("/verify-reset-otp")
def verify_reset_otp():
    """
    Verify 6-digit OTP code.
    Enforces maximum 5 attempts, expiration check, and single-use validation.
    Issues a short-lived password reset token upon success.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not email or not otp:
        return jsonify({"error": "Email address and 6-digit verification code are required"}), 400

    user = User.query.filter(User.email.ilike(email)).first()
    if not user:
        return jsonify({"error": "Invalid or expired verification code"}), 400

    now = datetime.utcnow()

    # Fetch latest active OTP record
    otp_record = (
        PasswordResetOTP.query.filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.is_used == False,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record or otp_record.is_verified:
        return jsonify({"error": "Invalid or expired verification code"}), 400

    # Increment attempts
    otp_record.attempts += 1

    if otp_record.attempts > 5:
        otp_record.is_used = True
        db.session.commit()
        return (
            jsonify({"error": "Maximum verification attempts exceeded. Please request a new code."}),
            400,
        )

    if otp_record.expires_at < now:
        otp_record.is_used = True
        db.session.commit()
        return (
            jsonify({"error": "Verification code has expired (5 minute limit). Please request a new code."}),
            400,
        )

    # Validate OTP hash
    if not verify_password(otp_record.otp_hash, otp):
        db.session.commit()
        remaining = max(0, 5 - otp_record.attempts)
        return (
            jsonify({"error": f"Invalid verification code. {remaining} attempt(s) remaining."}),
            400,
        )

    # Generate secure reset token
    reset_token = secrets.token_urlsafe(32)
    otp_record.reset_token_hash = hash_password(reset_token)
    otp_record.is_verified = True
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Verification code accepted",
                "reset_token": reset_token,
            }
        ),
        200,
    )


@auth_bp.post("/reset-password")
def reset_password_with_token():
    """
    Reset account password using verified reset token.
    Enforces token validity, 15-minute expiration, and invalidates all prior OTP records.
    """
    data = request.get_json(silent=True) or {}
    reset_token = (data.get("reset_token") or "").strip()
    new_password = data.get("new_password") or ""

    if not reset_token:
        return jsonify({"error": "Reset authorization token is missing"}), 400

    if not new_password or len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    now = datetime.utcnow()
    fifteen_mins_ago = now - timedelta(minutes=15)

    # Find candidates
    candidates = (
        PasswordResetOTP.query.filter(
            PasswordResetOTP.is_verified == True,
            PasswordResetOTP.is_used == False,
            PasswordResetOTP.created_at >= fifteen_mins_ago,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .all()
    )

    matched_record = None
    for cand in candidates:
        if cand.reset_token_hash and verify_password(cand.reset_token_hash, reset_token):
            matched_record = cand
            break

    if not matched_record:
        return (
            jsonify(
                {
                    "error": "Invalid or expired password reset session. Please request a new verification code."
                }
            ),
            400,
        )

    user = User.query.get(matched_record.user_id)
    if not user:
        return jsonify({"error": "User account not found"}), 404

    # Update password
    user.password_hash = hash_password(new_password)

    # Invalidate all OTPs and reset tokens for this user
    all_user_otps = PasswordResetOTP.query.filter(PasswordResetOTP.user_id == user.id).all()
    for otp_entry in all_user_otps:
        otp_entry.is_used = True

    db.session.commit()

    return (
        jsonify(
            {
                "message": "Password reset successful! You can now sign in with your new password."
            }
        ),
        200,
    )


