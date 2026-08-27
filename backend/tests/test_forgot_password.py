import sys
from pathlib import Path
import pytest
from datetime import datetime, timedelta

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app, db
from models.user import User
from models.password_reset_otp import PasswordResetOTP
from services.auth_service import hash_password, verify_password


@pytest.fixture
def app_instance():
    """Create isolated testing application instance with in-memory SQLite database."""
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-super-secret-key-32-characters-long",
    }
    app = create_app(test_config=test_config)

    with app.app_context():
        db.create_all()
        # Seed a test farmer account
        farmer = User(
            name="Ruwan Perera",
            phone="0771234567",
            email="ruwan@cattlesense.lk",
            password_hash=hash_password("OldSecret123!"),
            role="farmer",
        )
        db.session.add(farmer)
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app_instance):
    return app_instance.test_client()


def test_forgot_password_validation_for_known_and_unknown_emails(client, app_instance):
    """Ensure registered emails receive OTP and unregistered emails return 404 error."""
    # 1. Known email
    res1 = client.post("/api/auth/forgot-password", json={"email": "ruwan@cattlesense.lk"})
    assert res1.status_code == 200
    assert "Verification code sent" in res1.json["message"] or "verification code has been sent" in res1.json["message"]

    # Verify OTP was hashed and stored in database
    with app_instance.app_context():
        otp_entry = PasswordResetOTP.query.filter_by(email="ruwan@cattlesense.lk").first()
        assert otp_entry is not None
        assert otp_entry.otp_hash is not None
        assert otp_entry.otp_hash != "123456"  # Must never be plaintext
        assert otp_entry.is_verified is False
        assert otp_entry.is_used is False

    # 2. Unknown email -> Returns 404
    res2 = client.post("/api/auth/forgot-password", json={"email": "unknown_farmer@gmail.com"})
    assert res2.status_code == 404
    assert "No account found with this email address" in res2.json["error"]


def test_forgot_password_rate_limiting_60_seconds(client, app_instance):
    """Ensure a user cannot spam OTP requests within 60 seconds."""
    res1 = client.post("/api/auth/forgot-password", json={"email": "ruwan@cattlesense.lk"})
    assert res1.status_code == 200

    # Immediate second request should trigger 429
    res2 = client.post("/api/auth/forgot-password", json={"email": "ruwan@cattlesense.lk"})
    assert res2.status_code == 429
    assert "Please wait 60 seconds" in res2.json["error"]


def test_verify_otp_success_and_token_generation(client, app_instance):
    """Ensure valid 6-digit OTP verification issues a short-lived reset token."""
    # Seed known OTP in DB
    with app_instance.app_context():
        farmer = User.query.filter_by(email="ruwan@cattlesense.lk").first()
        test_otp = "849201"
        otp_rec = PasswordResetOTP(
            user_id=farmer.id,
            email=farmer.email,
            otp_hash=hash_password(test_otp),
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            created_at=datetime.utcnow(),
        )
        db.session.add(otp_rec)
        db.session.commit()

    # 1. Invalid OTP
    res_bad = client.post("/api/auth/verify-reset-otp", json={"email": "ruwan@cattlesense.lk", "otp": "000000"})
    assert res_bad.status_code == 400
    assert "Invalid verification code" in res_bad.json["error"]

    # 2. Valid OTP
    res_good = client.post("/api/auth/verify-reset-otp", json={"email": "ruwan@cattlesense.lk", "otp": "849201"})
    assert res_good.status_code == 200
    assert "reset_token" in res_good.json
    reset_token = res_good.json["reset_token"]
    assert len(reset_token) >= 20


def test_verify_otp_max_attempts_lockout(client, app_instance):
    """Ensure more than 5 failed OTP verification attempts invalidate the session."""
    with app_instance.app_context():
        farmer = User.query.filter_by(email="ruwan@cattlesense.lk").first()
        otp_rec = PasswordResetOTP(
            user_id=farmer.id,
            email=farmer.email,
            otp_hash=hash_password("999111"),
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            created_at=datetime.utcnow(),
        )
        db.session.add(otp_rec)
        db.session.commit()

    # Submit 5 wrong attempts
    for _ in range(5):
        client.post("/api/auth/verify-reset-otp", json={"email": "ruwan@cattlesense.lk", "otp": "000000"})

    # 6th attempt should lock out
    res_locked = client.post("/api/auth/verify-reset-otp", json={"email": "ruwan@cattlesense.lk", "otp": "999111"})
    assert res_locked.status_code == 400
    assert "Maximum verification attempts exceeded" in res_locked.json["error"]


def test_full_reset_password_flow_and_relogin(client, app_instance):
    """Complete end-to-end flow: OTP verify -> Password Reset -> Verify old password blocked -> New password login."""
    # 1. Setup verified OTP record
    raw_reset_token = "secure_random_reset_authorization_token_abc"
    with app_instance.app_context():
        farmer = User.query.filter_by(email="ruwan@cattlesense.lk").first()
        otp_rec = PasswordResetOTP(
            user_id=farmer.id,
            email=farmer.email,
            otp_hash=hash_password("123456"),
            reset_token_hash=hash_password(raw_reset_token),
            is_verified=True,
            is_used=False,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            created_at=datetime.utcnow(),
        )
        db.session.add(otp_rec)
        db.session.commit()

    # 2. Reset password with new password
    res_reset = client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": raw_reset_token,
            "new_password": "NewStrongPassword2026!",
        },
    )
    assert res_reset.status_code == 200
    assert "Password reset successful" in res_reset.json["message"]

    # 3. Attempt to replay reset token -> Should fail
    res_replay = client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": raw_reset_token,
            "new_password": "AnotherPassword123!",
        },
    )
    assert res_replay.status_code == 400

    # 4. Old password should no longer work
    res_old_login = client.post(
        "/api/auth/login",
        json={"identifier": "ruwan@cattlesense.lk", "password": "OldSecret123!"},
    )
    assert res_old_login.status_code == 401

    # 5. New password should successfully log in
    res_new_login = client.post(
        "/api/auth/login",
        json={"identifier": "ruwan@cattlesense.lk", "password": "NewStrongPassword2026!"},
    )
    assert res_new_login.status_code == 200
    assert "token" in res_new_login.json
    assert res_new_login.json["user"]["name"] == "Ruwan Perera"
