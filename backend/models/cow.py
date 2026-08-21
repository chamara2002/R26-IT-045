"""Cow model for herd management."""

from datetime import datetime, date

from . import db


class Cow(db.Model):
    """Represents one registered cow belonging to a user/farmer."""

    __tablename__ = "cows"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    
    # 1. Cow Details
    tag_id = db.Column(db.String(100), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=True)
    breed = db.Column(db.String(120), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    age = db.Column(db.Integer, nullable=True, default=0)
    gender = db.Column(db.String(20), nullable=True, default="Female")
    lactation_count = db.Column(db.Integer, nullable=True, default=0)
    current_lactation = db.Column(db.Integer, nullable=True)

    # 2. Farm Details
    date_acquired = db.Column(db.Date, nullable=True)
    source = db.Column(db.String(100), nullable=True)
    source_details = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = db.relationship("User", back_populates="cows")
    milk_yields = db.relationship("MilkYield", back_populates="cow", cascade="all, delete-orphan")
    mastitis_assessments = db.relationship("MastitisAssessment", back_populates="cow", cascade="all, delete-orphan")

    def to_dict(self):
        """Serialize cow fields for API responses."""
        latest_milk_yield = 0.0
        total_milk_yield = 0.0

        if self.milk_yields:
            ordered_yields = sorted(
                self.milk_yields,
                key=lambda log: (log.date, log.created_at),
                reverse=True,
            )
            latest_milk_yield = float(ordered_yields[0].milk_quantity)
            total_milk_yield = sum(float(log.milk_quantity) for log in self.milk_yields)

        now = datetime.utcnow()
        current_month_total = 0.0
        for log in (self.milk_yields or []):
            try:
                log_date = log.date
                if log_date.year == now.year and log_date.month == now.month:
                    current_month_total += float(log.milk_quantity)
            except Exception:
                continue

        # Tag identifier fallback for legacy records
        display_tag = self.tag_id or self.name or f"COW-{self.id}"

        return {
            "id": self.id,
            "user_id": self.user_id,
            "tag_id": display_tag,
            "name": self.name or "",
            "breed": self.breed or "Other",
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "age": self.age if self.age is not None else 0,
            "gender": self.gender or "Female",
            "lactation_count": self.lactation_count if self.lactation_count is not None else 0,
            "current_lactation": self.current_lactation,
            "date_acquired": self.date_acquired.isoformat() if self.date_acquired else None,
            "source": self.source or "",
            "source_details": self.source_details or "",
            "milk_yield": round(latest_milk_yield, 2),
            "milk_yield_total": round(total_milk_yield, 2),
            "milk_month_total": round(current_month_total, 2),
            "created_at": self.created_at.isoformat(),
        }
