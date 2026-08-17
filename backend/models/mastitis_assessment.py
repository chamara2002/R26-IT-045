"""Mastitis Assessment model for tracking saved cow mastitis clinical screening history."""

from datetime import datetime
from . import db


class MastitisAssessment(db.Model):
    """Represents an optionally saved mastitis assessment linked to a specific cow profile."""

    __tablename__ = "mastitis_assessments"

    id = db.Column(db.Integer, primary_key=True)
    cow_id = db.Column(db.Integer, db.ForeignKey("cows.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    assessment_datetime = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Prediction summary
    prediction = db.Column(db.String(50), nullable=False)  # "Normal", "Mastitis"
    confidence = db.Column(db.Float, nullable=True)
    stage = db.Column(db.String(100), nullable=True)  # "No Mastitis", "Mild Mastitis", etc.
    severity_level = db.Column(db.String(50), nullable=True)  # "negative", "mild", "moderate", "severe"
    severity_code = db.Column(db.Integer, nullable=True)  # 0, 1, 2, 3
    detection_mode = db.Column(db.String(50), nullable=True, default="assisted")

    # Image & Explainability details
    roi_applied = db.Column(db.Boolean, default=False)
    image_source = db.Column(db.String(50), default="full_image")
    roi_coordinates = db.Column(db.JSON, nullable=True)
    heatmap_id = db.Column(db.String(100), nullable=True)

    original_image_path = db.Column(db.String(255), nullable=True)
    cropped_image_path = db.Column(db.String(255), nullable=True)
    gradcam_heatmap_path = db.Column(db.String(255), nullable=True)
    gradcam_overlay_path = db.Column(db.String(255), nullable=True)

    # Model 1 & Model 2 AI details
    image_prediction = db.Column(db.JSON, nullable=True)
    numerical_prediction = db.Column(db.JSON, nullable=True)
    model_2_used = db.Column(db.Boolean, default=False)
    numerical_model_type = db.Column(db.String(50), nullable=True)
    missing_numerical_features = db.Column(db.JSON, nullable=True)

    # Numerical biomarker measurements (as entered, NULL if missing)
    milk_temperature = db.Column(db.Float, nullable=True)
    milk_ph = db.Column(db.Float, nullable=True)
    milk_conductivity = db.Column(db.Float, nullable=True)
    somatic_cell_count = db.Column(db.Float, nullable=True)
    milk_yield = db.Column(db.Float, nullable=True)
    clotting = db.Column(db.String(20), nullable=True)

    # Clinical questionnaire data
    clinical_observations = db.Column(db.JSON, nullable=True)

    # Farmer Guidance snapshot
    farmer_guidance = db.Column(db.JSON, nullable=True)
    recommendation = db.Column(db.Text, nullable=True)

    # Veterinary report link
    veterinary_report_path = db.Column(db.String(255), nullable=True)
    has_veterinary_report = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    cow = db.relationship("Cow", back_populates="mastitis_assessments")
    user = db.relationship("User", backref="mastitis_assessments")

    def to_dict(self):
        """Serialize assessment record for API responses."""
        return {
            "id": self.id,
            "cow_id": self.cow_id,
            "user_id": self.user_id,
            "cow_name": self.cow.name if self.cow else None,
            "cow_tag": self.cow.tag_id if self.cow else None,
            "assessment_datetime": self.assessment_datetime.isoformat(),
            "prediction": self.prediction,
            "confidence": self.confidence,
            "stage": self.stage,
            "severity_level": self.severity_level,
            "severity_code": self.severity_code,
            "detection_mode": self.detection_mode,
            "roi_applied": self.roi_applied,
            "image_source": self.image_source,
            "roi_coordinates": self.roi_coordinates,
            "heatmap_id": self.heatmap_id,
            "original_image_path": self.original_image_path,
            "cropped_image_path": self.cropped_image_path,
            "gradcam_heatmap_path": self.gradcam_heatmap_path,
            "gradcam_overlay_path": self.gradcam_overlay_path,
            "image_prediction": self.image_prediction,
            "numerical_prediction": self.numerical_prediction,
            "model_2_used": self.model_2_used,
            "numerical_model_type": self.numerical_model_type,
            "missing_numerical_features": self.missing_numerical_features or [],
            "numerical_measurements": {
                "milk_temperature": self.milk_temperature,
                "milk_ph": self.milk_ph,
                "milk_conductivity": self.milk_conductivity,
                "somatic_cell_count": self.somatic_cell_count,
                "milk_yield": self.milk_yield,
                "clotting": self.clotting,
            },
            "clinical_observations": self.clinical_observations or {},
            "farmer_guidance": self.farmer_guidance,
            "recommendation": self.recommendation,
            "veterinary_report_path": self.veterinary_report_path,
            "has_veterinary_report": self.has_veterinary_report,
            "created_at": self.created_at.isoformat(),
        }
