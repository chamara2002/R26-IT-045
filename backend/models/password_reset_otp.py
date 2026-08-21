"""Password Reset OTP model for secure email-based password recovery."""

from datetime import datetime

from . import db


class PasswordResetOTP(db.Model):
    """Represents a temporary, secure password reset OTP session."""

    __tablename__ = "password_reset_otps"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    otp_hash = db.Column(db.String(255), nullable=False)
    reset_token_hash = db.Column(db.String(255), nullable=True, index=True)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("password_reset_otps", cascade="all, delete-orphan"))

    def to_dict(self):
        """Serialize non-sensitive metadata for internal reporting."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email": self.email,
            "attempts": self.attempts,
            "is_verified": self.is_verified,
            "is_used": self.is_used,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
