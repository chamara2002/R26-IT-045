"""Cow model for herd management."""

from datetime import datetime

from . import db


class Cow(db.Model):
    """Represents one registered cow belonging to a user."""

    __tablename__ = "cows"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    breed = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    lactation_count = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = db.relationship("User", back_populates="cows")
    milk_yields = db.relationship("MilkYield", back_populates="cow", cascade="all, delete-orphan")

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
        # current month total
        now = datetime.utcnow()
        current_month_total = 0.0
        for log in (self.milk_yields or []):
            try:
                log_date = log.date
                if log_date.year == now.year and log_date.month == now.month:
                    current_month_total += float(log.milk_quantity)
            except Exception:
                continue

        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "breed": self.breed,
            "age": self.age,
            "lactation_count": self.lactation_count,
            "milk_yield": round(latest_milk_yield, 2),
            "milk_yield_total": round(total_milk_yield, 2),
            "milk_month_total": round(current_month_total, 2),
            "created_at": self.created_at.isoformat(),
        }
