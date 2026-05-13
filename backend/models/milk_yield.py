"""Milk yield model for daily production logs."""

from datetime import date, datetime

from . import db


class MilkYield(db.Model):
    """Stores daily milk quantity for a specific cow."""

    __tablename__ = "milk_yield"

    id = db.Column(db.Integer, primary_key=True)
    cow_id = db.Column(db.Integer, db.ForeignKey("cows.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    milk_quantity = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    cow = db.relationship("Cow", back_populates="milk_yields")

    def to_dict(self):
        """Serialize milk yield fields for API responses."""
        return {
            "id": self.id,
            "cow_id": self.cow_id,
            "date": self.date.isoformat(),
            "milk_quantity": float(self.milk_quantity),
            "created_at": self.created_at.isoformat(),
        }
