"""Admin invitation model for managing admin account requests."""

from datetime import datetime, timedelta

from . import db


class AdminInvite(db.Model):
    """Represents a pending admin account invitation."""

    __tablename__ = "admin_invites"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(50), default="pending", nullable=False)  # pending, approved, rejected, expired
    invited_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=7), nullable=False)
    approved_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approval_date = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    invited_by = db.relationship("User", foreign_keys=[invited_by_id], backref="admin_invites_sent")
    approved_by = db.relationship("User", foreign_keys=[approved_by_id], backref="admin_invites_approved")

    def to_dict(self):
        """Serialize invitation fields for API responses."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "status": self.status,
            "invited_by_id": self.invited_by_id,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "approved_by_id": self.approved_by_id,
            "approval_date": self.approval_date.isoformat() if self.approval_date else None,
            "notes": self.notes,
        }

    def is_expired(self):
        """Check if invitation has expired."""
        return datetime.utcnow() > self.expires_at and self.status == "pending"
