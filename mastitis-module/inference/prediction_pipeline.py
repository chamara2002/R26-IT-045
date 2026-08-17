"""
Prediction Pipeline for Mastitis Detection.
Coordinates data ingestion and inference with the HybridFusionModel.
"""
import sys
from pathlib import Path
import numpy as np
import cv2
from tensorflow.keras.applications.resnet import preprocess_input

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from inference.hybrid_fusion import HybridFusionModel

class PredictionPipeline:
    """Complete inference pipeline for Mastitis detection."""
    
    def __init__(self):
        self.fusion_model = HybridFusionModel()
    
    def predict_assisted(self, image_array, numerical_measurements=None, clinical_observations=None):
        """Run assisted multimodal prediction."""
        return self.fusion_model.predict_assisted(
            image_array=image_array,
            numerical_measurements=numerical_measurements,
            clinical_observations=clinical_observations
        )
