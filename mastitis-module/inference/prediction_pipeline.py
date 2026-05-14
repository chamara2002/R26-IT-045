"""
Prediction Pipeline for Mastitis Detection
Complete end-to-end inference pipeline.
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
    """Complete inference pipeline."""
    
    def __init__(self, image_weight=0.7):
        self.fusion_model = HybridFusionModel()
        self.image_weight = image_weight
    
    def predict_from_image_path(self, image_path, health_metrics):
        """Predict from image file path and health metrics."""
        # Load and preprocess image
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")
        
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize to 224x224
        img = cv2.resize(img, (224, 224))
        
        # Match the preprocessing used during CNN training
        img = preprocess_input(img.astype(np.float32))
        
        # Get prediction
        return self.fusion_model.hybrid_predict(img, health_metrics, self.image_weight)
    
    def predict_from_array(self, image_array, health_metrics):
        """Predict from numpy array and health metrics."""
        return self.fusion_model.hybrid_predict(image_array, health_metrics, self.image_weight)
    
    def format_result(self, result):
        """Format result for display/API."""
        hybrid_label = result['hybrid_prediction']['label']
        hybrid_conf = result['hybrid_prediction']['confidence']
        
        return {
            'prediction': 'Mastitis' if hybrid_label == 1 else 'Normal',
            'confidence': hybrid_conf,
            'recommendation': self._get_recommendation(hybrid_label, hybrid_conf),
            'image_prediction': result['image_prediction'],
            'health_prediction': result['health_prediction'],
            'hybrid_prediction': result['hybrid_prediction']
        }
    
    def _get_recommendation(self, label, confidence):
        """Generate recommendation based on prediction."""
        if label == 1:
            if confidence > 0.8:
                return "High risk of mastitis detected. Immediate veterinary consultation recommended."
            else:
                return "Possible mastitis detected. Schedule veterinary checkup soon."
        else:
            if confidence > 0.8:
                return "Cow appears healthy. Continue regular monitoring."
            else:
                return "Cow health status uncertain. Monitor closely and consult veterinarian if symptoms appear."


if __name__ == '__main__':
    # Example usage
    pipeline = PredictionPipeline(image_weight=0.7)
    
    # Dummy data
    dummy_image = np.random.rand(224, 224, 3).astype(np.float32)
    dummy_health = [38.5, 25.0, 35.0, 1.2, 2.5, 0.8]
    
    try:
        result = pipeline.predict_from_array(dummy_image, dummy_health)
        formatted = pipeline.format_result(result)
        
        print("\n" + "="*60)
        print("MASTITIS DETECTION RESULT")
        print("="*60)
        print(f"Prediction: {formatted['prediction']}")
        print(f"Confidence: {formatted['confidence']:.2%}")
        print(f"Recommendation: {formatted['recommendation']}")
        print("\nDetailed Results:")
        print(f"  Image Prediction: {formatted['image_prediction']['label']} (conf: {formatted['image_prediction']['confidence']:.2%})")
        print(f"  Health Prediction: {formatted['health_prediction']['label']} (conf: {formatted['health_prediction']['confidence']:.2%})")
        print("="*60)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
