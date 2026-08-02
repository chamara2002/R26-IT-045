"""
Hybrid Fusion for Mastitis Detection
Combines CNN predictions (image) with RF predictions (health metrics).
"""
import sys
from pathlib import Path
import numpy as np
import pickle

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_DIR = Path(__file__).resolve().parent.parent

class HybridFusionModel:
    """Fuse predictions from CNN and Random Forest models."""
    
    def __init__(self, cnn_model_path=None,
                 rf_model_path=None,
                 preprocessor_path=None):
        self.cnn_model_path = Path(cnn_model_path) if cnn_model_path is not None else BASE_DIR / 'models' / 'cnn_image_model.h5'
        self.rf_model_path = Path(rf_model_path) if rf_model_path is not None else BASE_DIR / 'models' / 'rf_health_model.pkl'
        self.preprocessor_path = Path(preprocessor_path) if preprocessor_path is not None else BASE_DIR / 'models' / 'numerical_preprocessor.pkl'
        
        self.cnn_model = None
        self.rf_model = None
        self.preprocessor = None
        
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models."""
        # Load CNN (defer TensorFlow import)
        if self.cnn_model_path.exists():
            try:
                from tensorflow import keras
                self.cnn_model = keras.models.load_model(str(self.cnn_model_path))
                print(f"✓ Loaded CNN model from {self.cnn_model_path}")
            except Exception as e:
                print(f"✗ Failed to load CNN model: {e}")
        
        # Load Random Forest
        if self.rf_model_path.exists():
            try:
                with open(self.rf_model_path, 'rb') as f:
                    self.rf_model = pickle.load(f)
                print(f"✓ Loaded RF model from {self.rf_model_path}")
            except Exception as e:
                print(f"✗ Failed to load RF model: {e}")
        
        # Load Preprocessor
        if self.preprocessor_path.exists():
            try:
                with open(self.preprocessor_path, 'rb') as f:
                    self.preprocessor = pickle.load(f)
                print(f"✓ Loaded Preprocessor from {self.preprocessor_path}")
            except Exception as e:
                print(f"✗ Failed to load Preprocessor: {e}")
    
    def predict_image(self, image_array):
        """Predict mastitis from image using CNN."""
        if self.cnn_model is None:
            raise ValueError("CNN model not loaded")
        
        # Ensure 4D shape: (batch, height, width, channels)
        if len(image_array.shape) == 3:
            image_array = np.expand_dims(image_array, axis=0)
        
        # Get prediction
        pred = self.cnn_model.predict(image_array, verbose=0)
        confidence = float(np.max(pred))
        label = int(np.argmax(pred))
        
        return label, confidence, pred
    
    def predict_health(self, health_metrics):
        """Predict mastitis from health metrics using Random Forest."""
        if self.rf_model is None:
            raise ValueError("Random Forest model not loaded")
        if self.preprocessor is None:
            raise ValueError("Preprocessor not loaded")
        
        # Preprocess metrics
        health_metrics = np.array(health_metrics).reshape(1, -1)
        health_metrics_scaled = self.preprocessor.transform(health_metrics)
        
        # Get prediction
        pred = self.rf_model.predict(health_metrics_scaled)[0]
        proba = self.rf_model.predict_proba(health_metrics_scaled)[0]
        confidence = float(np.max(proba))
        
        return pred, confidence, proba

    def assess_behavior(self, behavior_signals):
        """Convert optional behavior answers into a lightweight risk signal."""
        if not behavior_signals:
            return None

        behavior_weights = {
            "reduced_appetite": 1.0,
            "restless_or_discomfort": 1.0,
            "kicking_during_milking": 1.25,
            "swollen_udder": 1.5,
            "warm_or_painful_udder": 1.5,
            "clots_in_milk": 1.5,
        }

        provided_signals = {}
        weighted_score = 0.0
        total_weight = 0.0

        for signal_name, weight in behavior_weights.items():
            raw_value = behavior_signals.get(signal_name, False)
            normalized_value = bool(raw_value) if not isinstance(raw_value, str) else raw_value.lower() in {"1", "true", "yes", "on"}
            provided_signals[signal_name] = normalized_value
            total_weight += weight
            if normalized_value:
                weighted_score += weight

        risk_ratio = weighted_score / total_weight if total_weight else 0.0

        if risk_ratio >= 0.7:
            risk_label = "High"
            mastitis_confidence = 0.88
        elif risk_ratio >= 0.35:
            risk_label = "Medium"
            mastitis_confidence = 0.66
        else:
            risk_label = "Low"
            mastitis_confidence = 0.22

        return {
            "risk_label": risk_label,
            "confidence": float(mastitis_confidence),
            "score": float(risk_ratio),
            "signals": provided_signals,
        }

    def predict_assisted(self, image_array, health_metrics=None, behavior_signals=None, image_weight=0.7):
        """Predict mastitis using image plus optional health metrics and behavior signals."""
        image_label, image_conf, image_pred = self.predict_image(image_array)
        image_mastitis_conf = float(image_pred[0][1])

        health_result = None
        health_mastitis_conf = None
        if health_metrics is not None:
            health_label, health_conf, health_pred = self.predict_health(health_metrics)
            health_mastitis_conf = float(health_pred[1])
            health_result = {
                "label": int(health_label),
                "confidence": float(health_conf),
                "mastitis_confidence": health_mastitis_conf,
            }

        behavior_result = self.assess_behavior(behavior_signals)

        source_scores = [
            (image_mastitis_conf, image_weight if health_result else 1.0),
        ]
        if health_mastitis_conf is not None:
            source_scores.append((health_mastitis_conf, 0.3))
        if behavior_result is not None:
            source_scores.append((behavior_result["confidence"], 0.15))

        total_weight = sum(weight for _, weight in source_scores)
        overall_confidence = sum(score * weight for score, weight in source_scores) / total_weight if total_weight else image_mastitis_conf
        overall_label = 1 if overall_confidence >= 0.5 else 0

        return {
            "image_prediction": {
                "label": int(image_label),
                "confidence": float(image_conf),
                "mastitis_confidence": image_mastitis_conf,
            },
            "health_prediction": health_result,
            "behavior_assessment": behavior_result,
            "overall_prediction": {
                "label": int(overall_label),
                "confidence": float(overall_confidence),
                "mastitis_confidence": float(overall_confidence),
                "sources_used": [
                    "image",
                    *(["health"] if health_result is not None else []),
                    *(["behavior"] if behavior_result is not None else []),
                ],
            },
        }
    
    def hybrid_predict(self, image_array, health_metrics, image_weight=0.7):
        """Combine predictions from both models."""
        # Get individual predictions
        image_label, image_conf, image_pred = self.predict_image(image_array)
        health_label, health_conf, health_pred = self.predict_health(health_metrics)
        
        # Extract confidence for mastitis class (1)
        image_mastitis_conf = image_pred[0][1]
        health_mastitis_conf = health_pred[1]
        
        # Weighted fusion
        fused_conf = (image_weight * image_mastitis_conf + 
                     (1 - image_weight) * health_mastitis_conf)
        
        fused_label = 1 if fused_conf > 0.5 else 0
        
        result = {
            'image_prediction': {
                'label': image_label,
                'confidence': image_conf,
                'mastitis_confidence': float(image_mastitis_conf)
            },
            'health_prediction': {
                'label': health_label,
                'confidence': health_conf,
                'mastitis_confidence': float(health_mastitis_conf)
            },
            'hybrid_prediction': {
                'label': fused_label,
                'confidence': float(fused_conf),
                'image_weight': image_weight
            }
        }
        
        return result


if __name__ == '__main__':
    import cv2
    
    # Example usage
    fusion = HybridFusionModel()
    
    # Dummy image (224x224x3)
    dummy_image = np.random.rand(224, 224, 3).astype(np.float32)
    
    # Dummy health metrics (6 features)
    dummy_health = [38.5, 25.0, 35.0, 1.2, 2.5, 0.8]
    
    try:
        result = fusion.hybrid_predict(dummy_image, dummy_health, image_weight=0.7)
        print("\nHybrid Prediction Result:")
        print(f"  Image Prediction: {result['image_prediction']}")
        print(f"  Health Prediction: {result['health_prediction']}")
        print(f"  Hybrid Prediction: {result['hybrid_prediction']}")
    except Exception as e:
        print(f"Error: {e}")
