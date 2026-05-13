"""User model for authentication and ownership."""

from datetime import datetime

from . import db


class User(db.Model):
    """Represents a farmer account."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default="farmer", nullable=False)  # 'farmer' or 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    cows = db.relationship("Cow", back_populates="owner", cascade="all, delete-orphan")

    def to_dict(self):
        """Serialize non-sensitive user fields for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
        }
