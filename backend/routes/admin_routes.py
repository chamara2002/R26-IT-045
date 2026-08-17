"""Admin API routes for managing users, ads, and system."""

import os
import uuid
from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

from models import db
from models.user import User
from models.ad import Ad
from models.detection_log import DetectionLog
from models.admin_invite import AdminInvite
from services.auth_service import hash_password, verify_password

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

ADS_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "ads")
os.makedirs(ADS_UPLOAD_DIR, exist_ok=True)


def admin_required(fn):
    """Decorator to require admin role."""
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper


# USER MANAGEMENT ENDPOINTS
@admin_bp.get("/users")
@admin_required
def get_all_users():
    """Get list of all users with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "", type=str).strip().lower()
    role_filter = request.args.get("role", "", type=str).strip()
    
    query = User.query
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%"))
        )
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    pagination = query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        "users": [user.to_dict() for user in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
    }), 200


@admin_bp.get("/users/<int:user_id>")
@admin_required
def get_user(user_id):
    """Get specific user details."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({"user": user.to_dict()}), 200


@admin_bp.put("/users/<int:user_id>")
@admin_required
def update_user(user_id):
    """Update user details (including role)."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.get_json(silent=True) or {}
    
    if "name" in data:
        user.name = (data.get("name") or "").strip()
    
    if "email" in data:
        new_email = (data.get("email") or "").strip().lower()
        existing_user = User.query.filter(User.email == new_email, User.id != user_id).first()
        if existing_user:
            return jsonify({"error": "Email already in use"}), 409
        user.email = new_email
    
    if "phone" in data:
        new_phone = (data.get("phone") or "").strip() or None
        if new_phone:
            existing_phone = User.query.filter(User.phone == new_phone, User.id != user_id).first()
            if existing_phone:
                return jsonify({"error": "Mobile number already in use"}), 409
        user.phone = new_phone
    
    if "farm_name" in data or "farmName" in data:
        user.farm_name = (data.get("farm_name") or data.get("farmName") or "").strip() or None
    if "province" in data:
        user.province = (data.get("province") or "").strip() or None
    if "district" in data:
        user.district = (data.get("district") or "").strip() or None
    if "ds_division" in data or "dsDivision" in data:
        user.ds_division = (data.get("ds_division") or data.get("dsDivision") or "").strip() or None
    if "gn_division" in data or "gnDivision" in data:
        user.gn_division = (data.get("gn_division") or data.get("gnDivision") or "").strip() or None
    if "farm_address" in data or "farmAddress" in data:
        user.farm_address = (data.get("farm_address") or data.get("farmAddress") or "").strip() or None
    if "cattle_count" in data or "cattleCount" in data:
        c_val = data.get("cattle_count") if data.get("cattle_count") is not None else data.get("cattleCount")
        try:
            user.cattle_count = int(c_val) if c_val is not None and str(c_val).strip() != "" else None
        except (ValueError, TypeError):
            pass
    if "farming_experience" in data or "farmingExperience" in data:
        user.farming_experience = (data.get("farming_experience") or data.get("farmingExperience") or "").strip() or None
    
    if "role" in data:
        role = data.get("role", "farmer").strip().lower()
        if role not in ["farmer", "admin"]:
            return jsonify({"error": "Invalid role"}), 400
        user.role = role
    
    if "password" in data:
        password = data.get("password") or ""
        if password and len(password) >= 6:
            user.password_hash = hash_password(password)
    
    db.session.commit()
    return jsonify({"message": "User updated", "user": user.to_dict()}), 200


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    """Delete a user account."""
    if user_id == int(get_jwt_identity()):
        return jsonify({"error": "Cannot delete your own account"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"message": "User deleted"}), 200


# ADVERTISEMENTS MANAGEMENT ENDPOINTS
@admin_bp.get("/ads/active")
def get_active_ads():
    """Get active advertisements for public landing page."""
    now = datetime.utcnow()
    ads = (
        Ad.query.filter(
            (Ad.status == "active") |
            (
                (Ad.status == "scheduled") &
                (Ad.scheduled_start <= now) &
                ((Ad.scheduled_end == None) | (Ad.scheduled_end >= now))
            )
        )
        .order_by(Ad.created_at.desc())
        .limit(10)
        .all()
    )
    return jsonify({
        "success": True,
        "ads": [ad.to_dict() for ad in ads],
    }), 200


@admin_bp.post("/ads/upload-image")
@admin_required
def upload_ad_image():
    """Upload advertisement banner image file."""
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if not file or not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        return jsonify({"error": "Allowed formats: JPG, JPEG, PNG, WEBP, GIF"}), 400

    filename = f"ad_{uuid.uuid4().hex[:12]}.{ext}"
    file_path = os.path.join(ADS_UPLOAD_DIR, filename)
    file.save(file_path)

    image_url = f"/api/admin/ads/images/{filename}"
    return jsonify({
        "success": True,
        "image_url": image_url,
        "filename": filename,
    }), 201


@admin_bp.get("/ads/images/<filename>")
def serve_ad_image(filename):
    """Serve uploaded advertisement image publicly."""
    return send_from_directory(ADS_UPLOAD_DIR, secure_filename(filename))


@admin_bp.get("/ads")
@admin_required
def get_all_ads():
    """Get list of all ads with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status_filter = request.args.get("status", "", type=str).strip()
    
    query = Ad.query
    
    if status_filter:
        query = query.filter(Ad.status == status_filter)
    
    pagination = query.order_by(Ad.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "ads": [ad.to_dict() for ad in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
    }), 200


@admin_bp.post("/ads")
@admin_required
def create_ad():
    """Create a new advertisement."""
    admin_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    
    description = data.get("description", "").strip()
    image_url = data.get("image_url", "").strip()
    link = data.get("link", "").strip()
    status = data.get("status", "active").strip().lower()
    
    if status not in ["active", "inactive", "scheduled"]:
        status = "active"
    
    scheduled_start = None
    scheduled_end = None
    
    if status == "scheduled":
        try:
            if data.get("scheduled_start"):
                scheduled_start = datetime.fromisoformat(data.get("scheduled_start"))
            if data.get("scheduled_end"):
                scheduled_end = datetime.fromisoformat(data.get("scheduled_end"))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid date format"}), 400
    
    ad = Ad(
        title=title,
        description=description,
        image_url=image_url,
        link=link,
        status=status,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        created_by_id=admin_id,
    )
    
    db.session.add(ad)
    db.session.commit()
    
    return jsonify({"message": "Ad created", "ad": ad.to_dict()}), 201


@admin_bp.get("/ads/<int:ad_id>")
@admin_required
def get_ad(ad_id):
    """Get specific ad details."""
    ad = Ad.query.get(ad_id)
    if not ad:
        return jsonify({"error": "Ad not found"}), 404
    
    return jsonify({"ad": ad.to_dict()}), 200


@admin_bp.put("/ads/<int:ad_id>")
@admin_required
def update_ad(ad_id):
    """Update advertisement details."""
    ad = Ad.query.get(ad_id)
    if not ad:
        return jsonify({"error": "Ad not found"}), 404
    
    data = request.get_json(silent=True) or {}
    
    if "title" in data:
        title = (data.get("title") or "").strip()
        if title:
            ad.title = title
    
    if "description" in data:
        ad.description = data.get("description", "").strip()
    
    if "image_url" in data:
        ad.image_url = data.get("image_url", "").strip()
    
    if "link" in data:
        ad.link = data.get("link", "").strip()
    
    if "status" in data:
        status = data.get("status", "active").strip().lower()
        if status in ["active", "inactive", "scheduled"]:
            ad.status = status
    
    if "scheduled_start" in data and data.get("scheduled_start"):
        try:
            ad.scheduled_start = datetime.fromisoformat(data.get("scheduled_start"))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid scheduled_start format"}), 400
    
    if "scheduled_end" in data and data.get("scheduled_end"):
        try:
            ad.scheduled_end = datetime.fromisoformat(data.get("scheduled_end"))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid scheduled_end format"}), 400
    
    ad.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({"message": "Ad updated", "ad": ad.to_dict()}), 200


@admin_bp.delete("/ads/<int:ad_id>")
@admin_required
def delete_ad(ad_id):
    """Delete an advertisement."""
    ad = Ad.query.get(ad_id)
    if not ad:
        return jsonify({"error": "Ad not found"}), 404
    
    db.session.delete(ad)
    db.session.commit()
    
    return jsonify({"message": "Ad deleted"}), 200


# DETECTION LOGS ENDPOINTS
@admin_bp.get("/logs")
@admin_required
def get_detection_logs():
    """Get detection logs with filtering."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    module_filter = request.args.get("module", "", type=str).strip()
    result_filter = request.args.get("result", "", type=str).strip()
    user_id_filter = request.args.get("user_id", "", type=str).strip()
    
    query = DetectionLog.query
    
    if module_filter:
        query = query.filter(DetectionLog.module_name == module_filter)
    
    if result_filter:
        query = query.filter(DetectionLog.result == result_filter)
    
    if user_id_filter:
        try:
            user_id = int(user_id_filter)
            query = query.filter(DetectionLog.user_id == user_id)
        except (ValueError, TypeError):
            pass
    
    pagination = query.order_by(DetectionLog.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "logs": [log.to_dict() for log in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
    }), 200


@admin_bp.get("/logs/<int:log_id>")
@admin_required
def get_detection_log(log_id):
    """Get specific detection log."""
    log = DetectionLog.query.get(log_id)
    if not log:
        return jsonify({"error": "Log not found"}), 404
    
    return jsonify({"log": log.to_dict()}), 200


# DASHBOARD STATS
@admin_bp.get("/stats")
@admin_required
def get_admin_stats():
    """Get dashboard statistics."""
    total_users = User.query.count()
    total_admins = User.query.filter(User.role == "admin").count()
    total_farmers = User.query.filter(User.role == "farmer").count()
    total_ads = Ad.query.count()
    active_ads = Ad.query.filter(Ad.status == "active").count()
    total_detection_logs = DetectionLog.query.count()
    
    # Get recent logs
    recent_logs = DetectionLog.query.order_by(DetectionLog.created_at.desc()).limit(10).all()
    
    # Get stats by module
    modules = db.session.query(
        DetectionLog.module_name,
        db.func.count(DetectionLog.id).label("count")
    ).group_by(DetectionLog.module_name).all()
    
    modules_data = {module: count for module, count in modules}
    
    return jsonify({
        "users": {
            "total": total_users,
            "admins": total_admins,
            "farmers": total_farmers,
        },
        "ads": {
            "total": total_ads,
            "active": active_ads,
        },
        "detection_logs": {
            "total": total_detection_logs,
            "by_module": modules_data,
        },
        "recent_logs": [log.to_dict() for log in recent_logs],
    }), 200


# ADMIN MANAGEMENT ENDPOINTS
@admin_bp.get("/admins")
@admin_required
def get_all_admins():
    """Get list of all admins."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    admins = User.query.filter(User.role == "admin").paginate(page=page, per_page=per_page)
    
    return jsonify({
        "admins": [admin.to_dict() for admin in admins.items],
        "total": admins.total,
        "pages": admins.pages,
        "current_page": page,
    }), 200


@admin_bp.delete("/admins/<int:admin_id>")
@admin_required
def delete_admin(admin_id):
    """Delete an admin account."""
    current_admin_id = int(get_jwt_identity())
    if admin_id == current_admin_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    admin_user = User.query.get(admin_id)
    if not admin_user:
        return jsonify({"error": "Admin not found"}), 404

    if admin_user.role != "admin":
        return jsonify({"error": "Target user is not an admin"}), 400

    db.session.delete(admin_user)
    db.session.commit()

    return jsonify({"message": "Admin deleted"}), 200


@admin_bp.get("/invites")
@admin_required
def get_admin_invites():
    """Get pending and past admin invitations."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status_filter = request.args.get("status", "", type=str).strip()
    
    query = AdminInvite.query
    
    if status_filter:
        query = query.filter(AdminInvite.status == status_filter)
    
    invites = query.order_by(AdminInvite.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "invites": [invite.to_dict() for invite in invites.items],
        "total": invites.total,
        "pages": invites.pages,
        "current_page": page,
    }), 200


@admin_bp.post("/invites")
@admin_required
def create_admin_invite():
    """Create an invitation for a new admin account."""
    admin_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    
    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    
    if not email or not name:
        return jsonify({"error": "Email and name are required"}), 400
    
    # Check if email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 409
    
    # Check if invitation already exists
    existing_invite = AdminInvite.query.filter_by(email=email, status="pending").first()
    if existing_invite:
        return jsonify({"error": "Invitation already exists for this email"}), 409
    
    invite = AdminInvite(
        email=email,
        name=name,
        invited_by_id=admin_id,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    
    db.session.add(invite)
    db.session.commit()
    
    return jsonify({
        "message": "Invitation sent",
        "invite": invite.to_dict()
    }), 201


@admin_bp.put("/invites/<int:invite_id>/approve")
@admin_required
def approve_admin_invite(invite_id):
    """Approve an admin invitation."""
    admin_id = int(get_jwt_identity())
    
    invite = AdminInvite.query.get(invite_id)
    if not invite:
        return jsonify({"error": "Invitation not found"}), 404
    
    if invite.status != "pending":
        return jsonify({"error": f"Cannot approve invitation with status {invite.status}"}), 400
    
    if invite.is_expired():
        invite.status = "expired"
        db.session.commit()
        return jsonify({"error": "Invitation has expired"}), 400
    
    # Approve the invitation
    invite.status = "approved"
    invite.approved_by_id = admin_id
    invite.approval_date = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        "message": "Invitation approved",
        "invite": invite.to_dict()
    }), 200


@admin_bp.put("/invites/<int:invite_id>/reject")
@admin_required
def reject_admin_invite(invite_id):
    """Reject an admin invitation."""
    data = request.get_json(silent=True) or {}
    
    invite = AdminInvite.query.get(invite_id)
    if not invite:
        return jsonify({"error": "Invitation not found"}), 404
    
    if invite.status != "pending":
        return jsonify({"error": f"Cannot reject invitation with status {invite.status}"}), 400
    
    # Reject the invitation
    invite.status = "rejected"
    invite.notes = data.get("reason", "")
    db.session.commit()
    
    return jsonify({
        "message": "Invitation rejected",
        "invite": invite.to_dict()
    }), 200


@admin_bp.post("/admins/create-from-invite")
@jwt_required()
def create_admin_from_invite():
    """Create admin account from approved invitation (called by the invited user)."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    
    invite_id = data.get("invite_id")
    password = data.get("password")
    
    if not invite_id or not password:
        return jsonify({"error": "Invite ID and password are required"}), 400
    
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    invite = AdminInvite.query.get(invite_id)
    if not invite:
        return jsonify({"error": "Invitation not found"}), 404
    
    if invite.status != "approved":
        return jsonify({"error": f"Invitation status is {invite.status}, cannot create admin"}), 400
    
    if invite.is_expired():
        return jsonify({"error": "Invitation has expired"}), 400
    
    # Create new admin user
    admin_user = User(
        name=invite.name,
        email=invite.email,
        password_hash=hash_password(password),
        role="admin"
    )
    
    db.session.add(admin_user)
    invite.status = "completed"
    db.session.commit()
    
    return jsonify({
        "message": "Admin account created successfully",
        "user": admin_user.to_dict()
    }), 201


# SETTINGS ENDPOINTS
@admin_bp.get("/settings")
@admin_required
def get_settings():
    """Get system settings."""
    # For now, return dummy settings. In production, store in database or config
    settings = {
        "app_name": "CattleSense",
        "version": "1.0.0",
        "notifications_enabled": True,
        "email_notifications": True,
        "maintenance_mode": False,
        "max_upload_size_mb": 50,
    }
    return jsonify(settings), 200


@admin_bp.put("/settings")
@admin_required
def update_settings():
    """Update system settings."""
    data = request.get_json(silent=True) or {}
    
    # In production, save these to database or config file
    # For now, just validate and return success
    
    updated_settings = {
        "notifications_enabled": data.get("notifications_enabled", True),
        "email_notifications": data.get("email_notifications", True),
        "maintenance_mode": data.get("maintenance_mode", False),
    }
    
    return jsonify({"message": "Settings updated", "settings": updated_settings}), 200
