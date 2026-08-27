"""
Prediction Pipeline for Mastitis Detection.
Coordinates data ingestion and inference with the HybridFusionModel.
"""
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from inference.hybrid_fusion import HybridFusionModel


class PredictionPipeline:
    """Complete inference pipeline for Mastitis detection."""

    def __init__(self):
        self.fusion_model = HybridFusionModel()

    def predict_assisted(self, image_array=None, numerical_measurements=None, clinical_observations=None, symptoms=None):
        """Run assisted multimodal, image-only, or numerical prediction with optional symptom checklist."""
        return self.fusion_model.predict_assisted(
            image_array=image_array,
            numerical_measurements=numerical_measurements,
            clinical_observations=clinical_observations,
            symptoms=symptoms
        )

    def predict_numerical(self, feature_data):
        """Run direct numerical prediction on the 4 mandatory features."""
        return self.fusion_model.predict_numerical(feature_data)
