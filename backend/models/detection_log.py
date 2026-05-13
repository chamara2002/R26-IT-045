"""Detection log model for tracking disease detection sessions."""

from datetime import datetime

from . import db


class DetectionLog(db.Model):
    """Represents a disease detection session log."""

    __tablename__ = "detection_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    cow_id = db.Column(db.Integer, db.ForeignKey("cows.id"), nullable=True)
    module_name = db.Column(db.String(100), nullable=False)  # e.g., 'fmd-module', 'mastitis-module'
    result = db.Column(db.String(50), nullable=False)  # e.g., 'positive', 'negative', 'inconclusive'
    confidence = db.Column(db.Float, nullable=True)
    session_data = db.Column(db.JSON, nullable=True)  # Store session data as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref="detection_logs")
    cow = db.relationship("Cow", backref="detection_logs")

    def to_dict(self):
        """Serialize detection log fields for API responses."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "cow_id": self.cow_id,
            "module_name": self.module_name,
            "result": self.result,
            "confidence": self.confidence,
            "session_data": self.session_data,
            "created_at": self.created_at.isoformat(),
        }
