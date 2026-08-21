"""User model for authentication and ownership."""

from datetime import datetime

from . import db


class User(db.Model):
    """Represents a farmer account."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), unique=True, nullable=True, index=True)
    email = db.Column(db.String(255), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default="farmer", nullable=False)  # 'farmer' or 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Farm details
    farm_name = db.Column(db.String(150), nullable=True)
    province = db.Column(db.String(100), nullable=True)
    district = db.Column(db.String(100), nullable=True)
    ds_division = db.Column(db.String(100), nullable=True)
    gn_division = db.Column(db.String(100), nullable=True)
    farm_address = db.Column(db.Text, nullable=True)
    cattle_count = db.Column(db.Integer, nullable=True)
    farming_experience = db.Column(db.String(100), nullable=True)

    cows = db.relationship("Cow", back_populates="owner", cascade="all, delete-orphan")

    def to_dict(self):
        """Serialize non-sensitive user fields for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "farm_name": self.farm_name,
            "province": self.province,
            "district": self.district,
            "ds_division": self.ds_division,
            "gn_division": self.gn_division,
            "farm_address": self.farm_address,
            "cattle_count": self.cattle_count,
            "farming_experience": self.farming_experience,
            "created_at": self.created_at.isoformat(),
        }
