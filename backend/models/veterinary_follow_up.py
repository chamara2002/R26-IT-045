"""Veterinary Follow-Up Tracking Model."""

from datetime import datetime, date
from . import db


class VeterinaryFollowUp(db.Model):
    """Represents a veterinary visit, diagnostic test, or clinical follow-up for a cow."""

    __tablename__ = "veterinary_follow_ups"

    id = db.Column(db.Integer, primary_key=True)
    cow_id = db.Column(db.Integer, db.ForeignKey("cows.id"), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("mastitis_assessments.id"), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Follow-up status
    # Pending | Vet Contacted | Vet Visit Completed | Under Treatment | Follow-up Required | Resolved
    status = db.Column(db.String(50), default="Pending", nullable=False)

    # Visit & Clinician details
    visit_date = db.Column(db.Date, nullable=True)
    veterinarian_name = db.Column(db.String(120), nullable=True)
    registration_number = db.Column(db.String(80), nullable=True)

    # Clinical findings & diagnostic tests
    diagnosis = db.Column(db.Text, nullable=True)
    diagnostic_tests = db.Column(db.JSON, nullable=True)  # List of tests e.g. ["Clinical examination", "California Mastitis Test (CMT)"]

    # Treatment & follow-up plans (recorded by farmer as advised by veterinarian)
    treatment_plan = db.Column(db.Text, nullable=True)
    follow_up_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    cow = db.relationship("Cow", backref=db.backref("veterinary_follow_ups", lazy="dynamic", cascade="all, delete-orphan"))
    assessment = db.relationship("MastitisAssessment", backref=db.backref("veterinary_follow_ups", lazy="dynamic"))
    user = db.relationship("User", backref=db.backref("veterinary_follow_ups", lazy="dynamic"))

    def to_dict(self):
        """Serialize follow-up record for API responses."""
        today = date.today()
        is_overdue = False
        is_due_soon = False

        if self.follow_up_date and self.status not in ("Resolved", "Vet Visit Completed"):
            if self.follow_up_date < today:
                is_overdue = True
            elif (self.follow_up_date - today).days <= 3:
                is_due_soon = True

        return {
            "id": self.id,
            "cow_id": self.cow_id,
            "assessment_id": self.assessment_id,
            "user_id": self.user_id,
            "cow_name": self.cow.name if self.cow else None,
            "cow_tag": self.cow.tag_id if self.cow else None,
            "status": self.status,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None,
            "veterinarian_name": self.veterinarian_name,
            "registration_number": self.registration_number,
            "diagnosis": self.diagnosis,
            "diagnostic_tests": self.diagnostic_tests or [],
            "treatment_plan": self.treatment_plan,
            "follow_up_date": self.follow_up_date.isoformat() if self.follow_up_date else None,
            "notes": self.notes,
            "is_overdue": is_overdue,
            "is_due_soon": is_due_soon,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
