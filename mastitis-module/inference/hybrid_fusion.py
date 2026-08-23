"""
Hybrid Fusion Interface for CattleSense Mastitis Detection.
Coordinates:
- Model 1: MobileNetV2 Image Model (Stage 1, frozen backbone)
- Model 2: Decision Tree Classifier (5 required features: Milk_Temperature, Milk_pH, Milk_Conductivity, Milk_Yield, Clotting)
- Multimodal Fusion Strategy (Model 1 + Model 2)
- Clinical Observations (Farmer questionnaire, metadata support)
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import json
import joblib
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.config import Config, get_config
from preprocessing.image_preprocessing import preprocess_image_for_model1
from utils.symptom_assessor import apply_symptom_fusion


class HybridFusionModel:
    """
    Modular interface connecting Model 1 (MobileNetV2), Model 2 (Decision Tree Classifier on 5 features),
    and Multimodal Fusion.
    """

    def __init__(self, cnn_model_path=None, model_2_path=None, metadata_path=None):
        config = get_config()
        self.cnn_model_path = Path(cnn_model_path) if cnn_model_path is not None else config.CNN_MODEL_PATH
        self.model_2_path = Path(model_2_path) if model_2_path is not None else config.MODEL_2_PATH
        self.model_2_fallback_path = config.MODEL_2_FALLBACK_PATH
        self.metadata_path = Path(metadata_path) if metadata_path is not None else config.METADATA_PATH

        self.model_1_class_names_path = config.MODEL_1_CLASS_NAMES_PATH
        self.model_1_threshold_path = config.MODEL_1_THRESHOLD_PATH
        self.metrics_path = config.METRICS_PATH

        self.cnn_model = None
        self.model_2 = None
        self.metadata = None
        self.model_1_threshold = 0.50
        self.model_1_class_names = {"0": "normal", "1": "mastitis"}
        self.class_mapping = {"0": "Normal", "1": "Mastitis"}

        self._load_models()

    def _load_models(self):
        """Load trained models and authoritative configs from disk."""
        # 1. Load Model 1 Threshold & Class Names
        if self.model_1_threshold_path.exists():
            try:
                with open(self.model_1_threshold_path, 'r') as f:
                    t_data = json.load(f)
                    self.model_1_threshold = float(t_data.get("selected_threshold", t_data.get("threshold", 0.25)))
            except Exception as e:
                print(f"⚠ Failed to load Model 1 threshold: {e}")

        if self.model_1_class_names_path.exists():
            try:
                with open(self.model_1_class_names_path, 'r') as f:
                    self.model_1_class_names = json.load(f)
            except Exception as e:
                print(f"⚠ Failed to load Model 1 class names: {e}")

        # 2. Load Model 1 (ResNet50 CNN)
        if self.cnn_model_path.exists():
            try:
                from tensorflow import keras
                self.cnn_model = keras.models.load_model(str(self.cnn_model_path))
                print(f"✓ Loaded Model 1 (ResNet50) from {self.cnn_model_path}")
            except Exception as e:
                print(f"✗ Failed to load Model 1 from {self.cnn_model_path}: {e}")

        # 3. Load Model 2 Metadata
        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, 'r') as f:
                    self.metadata = json.load(f)
                if "class_mapping" in self.metadata:
                    self.class_mapping = self.metadata["class_mapping"]
                print(f"✓ Loaded Model 2 Metadata from {self.metadata_path}")
            except Exception as e:
                print(f"⚠ Failed to load metadata from {self.metadata_path}: {e}")

        # 4. Load Model 2 (Decision Tree Classifier)
        m2_path = self.model_2_path if self.model_2_path.exists() else self.model_2_fallback_path
        if m2_path.exists():
            try:
                self.model_2 = joblib.load(str(m2_path))
                print(f"✓ Loaded Model 2 (Decision Tree) from {m2_path}")
            except Exception as e:
                print(f"✗ Failed to load Model 2 from {m2_path}: {e}")

    @property
    def is_image_model_ready(self):
        return self.cnn_model is not None

    @property
    def is_numerical_model_ready(self):
        return self.model_2 is not None

    # Backward compatibility alias
    @property
    def is_missing_aware_model_ready(self):
        return False

    def predict_image(self, image_array):
        """
        Run inference on Model 1 (MobileNetV2 CNN).
        Input: Preprocessed image array of shape (224, 224, 3) or (1, 224, 224, 3).
        Output: (label: int, confidence: float, probabilities: list)
        """
        if not self.is_image_model_ready:
            return None, None, None

        image_tensor = np.asarray(image_array, dtype=np.float32)
        if len(image_tensor.shape) == 3:
            image_tensor = np.expand_dims(image_tensor, axis=0)

        preds = self.cnn_model.predict(image_tensor, verbose=0)

        # Handle binary sigmoid output (shape: (1, 1) or (1,))
        if preds.shape[-1] == 1:
            prob_mastitis = float(preds[0][0]) if len(preds.shape) > 1 else float(preds[0])
            prob_normal = 1.0 - prob_mastitis
            label = 1 if prob_mastitis >= self.model_1_threshold else 0
            confidence = float(prob_mastitis if label == 1 else prob_normal)
            probabilities = [prob_normal, prob_mastitis]
        else:
            # Multi-class softmax: [prob_normal, prob_mastitis]
            label = int(np.argmax(preds[0]))
            confidence = float(np.max(preds[0]))
            probabilities = preds[0].tolist()

        return label, confidence, probabilities

    def predict_numerical(self, feature_data):
        """
        Run inference on the 5 mandatory features using decision_tree_model.joblib.
        Required features in exact order:
          1. Milk_Temperature: float (°C)
          2. Milk_pH: float
          3. Milk_Conductivity: float (mS/cm)
          4. Milk_Yield: float (L/day)
          5. Clotting: int (0 or 1)

        Returns: (predicted_class, normal_probability, mastitis_probability, label, confidence)
        """
        if not self.is_numerical_model_ready:
            raise RuntimeError("Model 2 is not loaded or ready.")

        if not isinstance(feature_data, dict):
            raise ValueError("Numerical measurements must be provided as a dictionary.")

        # Construct single-row DataFrame matching the exact feature order
        df = pd.DataFrame([{
            "Milk_Temperature": float(feature_data["Milk_Temperature"]),
            "Milk_pH": float(feature_data["Milk_pH"]),
            "Milk_Conductivity": float(feature_data["Milk_Conductivity"]),
            "Milk_Yield": float(feature_data["Milk_Yield"]),
            "Clotting": int(feature_data["Clotting"]),
        }], columns=["Milk_Temperature", "Milk_pH", "Milk_Conductivity", "Milk_Yield", "Clotting"])

        preds = self.model_2.predict(df)
        probas = self.model_2.predict_proba(df)

        raw_label = int(preds[0])
        normal_prob = float(probas[0][0])
        mastitis_prob = float(probas[0][1])

        predicted_class = self.class_mapping.get(str(raw_label), "Mastitis" if raw_label == 1 else "Normal")
        confidence = float(max(normal_prob, mastitis_prob))

        return {
            "predicted_class": predicted_class,
            "normal_probability": normal_prob,
            "mastitis_probability": mastitis_prob,
            "label": raw_label,
            "confidence": confidence,
            "probabilities": [normal_prob, mastitis_prob],
        }

    def predict_assisted(self, image_array=None, numerical_measurements=None, clinical_observations=None, symptoms=None):
        """
        Multimodal inference handler supporting:
        - Numerical measurements (5 features via Model 2 Decision Tree)
        - Udder photograph (Model 1 ResNet50)
        - Fusion of Image + Numerical when both are available
        - Optional Symptom Checklist adjustment layer
        """
        # 1. Model 1: Image prediction
        img_label, img_conf, img_probs = (None, None, None)
        if image_array is not None and self.is_image_model_ready:
            img_label, img_conf, img_probs = self.predict_image(image_array)

        # 2. Model 2: Numerical prediction
        num_result = None
        if numerical_measurements is not None and isinstance(numerical_measurements, dict):
            try:
                num_result = self.predict_numerical(numerical_measurements)
            except Exception as e:
                print(f"[Numerical Model Error] {e}")
                raise e

        # 3. Multimodal Fusion determination
        if img_label is not None and num_result is not None:
            # Both models provided predictions: soft-voting average of mastitis probability
            img_mastitis_prob = img_probs[1] if isinstance(img_probs, list) and len(img_probs) > 1 else float(img_label)
            num_mastitis_prob = num_result["mastitis_probability"]
            fused_mastitis_prob = float((img_mastitis_prob + num_mastitis_prob) / 2.0)
            fused_normal_prob = float(1.0 - fused_mastitis_prob)
            overall_label = 1 if fused_mastitis_prob >= 0.5 else 0
            overall_confidence = float(max(fused_mastitis_prob, fused_normal_prob))
            mode_used = "multimodal_image_numerical"
            final_normal_prob = fused_normal_prob
            final_mastitis_prob = fused_mastitis_prob
        elif num_result is not None:
            overall_label = num_result["label"]
            overall_confidence = num_result["confidence"]
            mode_used = "numerical_only"
            final_normal_prob = num_result["normal_probability"]
            final_mastitis_prob = num_result["mastitis_probability"]
        elif img_label is not None:
            img_mastitis_prob = img_probs[1] if isinstance(img_probs, list) and len(img_probs) > 1 else float(img_label)
            img_normal_prob = 1.0 - img_mastitis_prob
            overall_label = img_label
            overall_confidence = img_conf
            mode_used = "image_only"
            final_normal_prob = float(img_normal_prob)
            final_mastitis_prob = float(img_mastitis_prob)
        else:
            overall_label = None
            overall_confidence = None
            mode_used = "development_placeholder"
            final_normal_prob = 0.5
            final_mastitis_prob = 0.5

        # Image prediction details
        image_prediction_details = None
        if img_label is not None:
            img_mastitis_prob = (
                img_probs[1] if isinstance(img_probs, list) and len(img_probs) > 1
                else (float(img_label) if img_label is not None else None)
            )
            class_name = self.model_1_class_names.get(str(img_label), "mastitis" if img_label == 1 else "normal")
            display_prediction = class_name.capitalize()
            image_prediction_details = {
                "model": "ResNet50 (Stage 1, frozen backbone)",
                "status": "ready" if self.is_image_model_ready else "pending_training",
                "label": img_label,
                "prediction": display_prediction,
                "confidence": img_conf,
                "mastitis_confidence": img_mastitis_prob,
                "threshold": self.model_1_threshold,
            }

        # Numerical prediction details
        numerical_prediction_details = None
        if num_result is not None:
            numerical_prediction_details = {
                "model": "Decision Tree Classifier (Model 2)",
                "status": "ready",
                "label": num_result["label"],
                "prediction": num_result["predicted_class"],
                "confidence": num_result["confidence"],
                "normal_probability": num_result["normal_probability"],
                "mastitis_probability": num_result["mastitis_probability"],
            }

        # 4. Optional Symptom Checklist Fusion Layer
        symptom_assessment = None
        if final_mastitis_prob is not None:
            # Check if symptoms passed directly, or bundled inside clinical_observations
            sym_input = symptoms
            if sym_input is None and isinstance(clinical_observations, dict) and "symptoms" in clinical_observations:
                sym_input = clinical_observations["symptoms"]

            final_mastitis_prob, symptom_assessment = apply_symptom_fusion(
                final_mastitis_prob, sym_input
            )
            final_normal_prob = float(round(1.0 - final_mastitis_prob, 4))
            if symptom_assessment.get("adjustment_applied"):
                active_threshold = self.model_1_threshold if mode_used == "image_only" else 0.50
                overall_label = 1 if final_mastitis_prob >= active_threshold else 0
                overall_confidence = float(final_mastitis_prob if overall_label == 1 else final_normal_prob)

        # Final string prediction
        if overall_label is not None:
            final_prediction_str = "Mastitis" if overall_label == 1 else "Normal"
        else:
            final_prediction_str = "Model Pending Training"

        return {
            "prediction": final_prediction_str,
            "predicted_class": final_prediction_str,
            "confidence": overall_confidence,
            "overall_label": overall_label,
            "normal_probability": final_normal_prob,
            "mastitis_probability": final_mastitis_prob,
            "mode": mode_used,
            "model_2_used": bool(num_result is not None),
            "numerical_analysis_available": bool(num_result is not None),
            "numerical_model_status": "used" if num_result is not None else "not_available",
            "image_prediction": image_prediction_details,
            "numerical_prediction": numerical_prediction_details,
            "health_prediction": numerical_prediction_details,
            "clinical_observations": clinical_observations,
            "symptom_assessment": symptom_assessment,
            "sources_used": [
                *(["udder_image"] if img_label is not None else []),
                *(["numerical_measurements"] if num_result is not None else []),
                *(["clinical_observations"] if clinical_observations else []),
                *(["symptom_checklist"] if symptom_assessment and symptom_assessment.get("adjustment_applied") else []),
            ],
        }

