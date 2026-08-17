"""
Hybrid Fusion Interface for CattleSense Mastitis Detection.
Coordinates:
- Model 1: ResNet-50 CNN (Image Model)
- Model 2: Complete-input MLP (6 features) & Missing-input-aware MLP (12 features)
- Multimodal Fusion Strategy (Model 1 + Model 2)
- Clinical Observations (Farmer questionnaire, metadata support)
"""
import sys
from pathlib import Path
import numpy as np
import pickle
import joblib
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.config import Config, get_config


class HybridFusionModel:
    """
    Modular interface connecting Model 1 (CNN), Model 2 (Complete & Missing-Aware MLP),
    and Multimodal Fusion.
    """

    def __init__(self, cnn_model_path=None, mlp_model_path=None, preprocessor_path=None,
                 mlp_missing_aware_model_path=None, missing_aware_preprocessor_path=None):
        config = get_config()
        self.cnn_model_path = Path(cnn_model_path) if cnn_model_path is not None else config.CNN_MODEL_PATH
        self.cnn_fallback_path = config.CNN_MODEL_FALLBACK_PATH
        self.mlp_model_path = Path(mlp_model_path) if mlp_model_path is not None else config.MLP_MODEL_PATH
        self.mlp_fallback_path = config.MLP_MODEL_FALLBACK_PATH
        self.preprocessor_path = Path(preprocessor_path) if preprocessor_path is not None else config.PREPROCESSOR_PATH

        self.mlp_missing_aware_model_path = (
            Path(mlp_missing_aware_model_path)
            if mlp_missing_aware_model_path is not None
            else config.MLP_MISSING_AWARE_MODEL_PATH
        )
        self.missing_aware_preprocessor_path = (
            Path(missing_aware_preprocessor_path)
            if missing_aware_preprocessor_path is not None
            else config.MISSING_AWARE_PREPROCESSOR_PATH
        )
        self.max_missing_features = config.MAX_MISSING_NUMERICAL_FEATURES

        self.cnn_model = None
        self.mlp_model = None
        self.preprocessor = None
        self.mlp_missing_aware_model = None
        self.missing_aware_preprocessor = None

        self._load_models()

    def _load_models(self):
        """Load trained models and preprocessors from disk if available."""
        # 1. Load CNN (Model 1)
        cnn_path = self.cnn_model_path if self.cnn_model_path.exists() else self.cnn_fallback_path
        if cnn_path.exists():
            try:
                from tensorflow import keras
                self.cnn_model = keras.models.load_model(str(cnn_path))
                print(f"✓ Loaded Model 1 (CNN) from {cnn_path}")
            except Exception as e:
                print(f"✗ Failed to load CNN model: {e}")

        # 2. Load Complete-Input MLP (Model 2 Baseline)
        mlp_path = self.mlp_model_path if self.mlp_model_path.exists() else self.mlp_fallback_path
        if mlp_path.exists():
            try:
                from tensorflow import keras
                self.mlp_model = keras.models.load_model(str(mlp_path))
                print(f"✓ Loaded Complete-Input Model 2 (MLP) from {mlp_path}")
            except Exception as e:
                print(f"✗ Failed to load Complete-Input MLP model: {e}")

        # 3. Load Complete-Input Numerical Preprocessor
        if self.preprocessor_path.exists():
            try:
                self.preprocessor = joblib.load(str(self.preprocessor_path))
                print(f"✓ Loaded Numerical Preprocessor from {self.preprocessor_path}")
            except Exception:
                try:
                    with open(self.preprocessor_path, 'rb') as f:
                        self.preprocessor = pickle.load(f)
                    print(f"✓ Loaded Numerical Preprocessor from {self.preprocessor_path}")
                except Exception as e:
                    print(f"✗ Failed to load Preprocessor: {e}")

        # 4. Load Missing-Input-Aware MLP (Model 2 New)
        if self.mlp_missing_aware_model_path.exists():
            try:
                from tensorflow import keras
                self.mlp_missing_aware_model = keras.models.load_model(str(self.mlp_missing_aware_model_path))
                print(f"✓ Loaded Missing-Aware Model 2 (MLP) from {self.mlp_missing_aware_model_path}")
            except Exception as e:
                print(f"✗ Failed to load Missing-Aware MLP model: {e}")

        # 5. Load Missing-Aware Preprocessor
        if self.missing_aware_preprocessor_path.exists():
            try:
                self.missing_aware_preprocessor = joblib.load(str(self.missing_aware_preprocessor_path))
                print(f"✓ Loaded Missing-Aware Preprocessor from {self.missing_aware_preprocessor_path}")
            except Exception:
                try:
                    with open(self.missing_aware_preprocessor_path, 'rb') as f:
                        self.missing_aware_preprocessor = pickle.load(f)
                    print(f"✓ Loaded Missing-Aware Preprocessor from {self.missing_aware_preprocessor_path}")
                except Exception as e:
                    print(f"✗ Failed to load Missing-Aware Preprocessor: {e}")

    @property
    def is_image_model_ready(self):
        return self.cnn_model is not None

    @property
    def is_numerical_model_ready(self):
        return self.mlp_model is not None and self.preprocessor is not None

    @property
    def is_missing_aware_model_ready(self):
        return self.mlp_missing_aware_model is not None and self.missing_aware_preprocessor is not None

    def predict_image(self, image_array):
        """
        Run inference on Model 1 (ResNet-50 CNN).
        Input: Preprocessed image array of shape (224, 224, 3) or (1, 224, 224, 3).
        Output: (label: int, confidence: float, probabilities: list)
        """
        if not self.is_image_model_ready:
            return None, None, None

        if len(image_array.shape) == 3:
            image_array = np.expand_dims(image_array, axis=0)

        preds = self.cnn_model.predict(image_array, verbose=0)
        
        # Handle binary sigmoid output (shape: (1, 1) or (1,))
        if preds.shape[-1] == 1:
            prob_mastitis = float(preds[0][0]) if len(preds.shape) > 1 else float(preds[0])
            prob_normal = 1.0 - prob_mastitis
            label = 1 if prob_mastitis >= 0.5 else 0
            confidence = float(prob_mastitis if label == 1 else prob_normal)
            probabilities = [prob_normal, prob_mastitis]
        else:
            # Multi-class or 2-class softmax: [prob_normal, prob_mastitis]
            label = int(np.argmax(preds[0]))
            confidence = float(np.max(preds[0]))
            probabilities = preds[0].tolist()

        return label, confidence, probabilities

    def predict_numerical(self, numerical_features):
        """
        Run inference on numerical measurements with automatic model selection:
        - 0 missing (6/6 available) -> Complete-input Model 2 (mlp_numerical_model.keras)
        - 1 or 2 missing (4/6 or 5/6 available) -> Missing-input-aware Model 2 (mlp_numerical_missing_aware.keras)
        - >= 3 missing (<= 3/6 available) -> Model 2 unavailable (returns None)

        Input: List of 6 features [Milk_Temp, Milk_pH, Milk_Cond, SCC, Milk_Yield, Clotting].
        Values can be float/int or None. Valid 0/0.0 is NOT missing.

        Returns: (label, confidence, probabilities, model_type, missing_features)
        """
        if not isinstance(numerical_features, (list, tuple)) or len(numerical_features) != 6:
            return None, None, None, "unavailable", []

        # Identify missing indices (None, NaN). Note: 0 / 0.0 is a valid value!
        missing_indices = [
            i for i, v in enumerate(numerical_features)
            if v is None or (isinstance(v, float) and np.isnan(v))
        ]
        missing_count = len(missing_indices)
        missing_feature_names = [Config.NUMERICAL_FEATURE_NAMES[i] for i in missing_indices]

        # Case 1: All 6 features present (0 missing) -> Complete-input Model 2
        if missing_count == 0 and self.is_numerical_model_ready:
            try:
                feat_array = np.array(numerical_features, dtype=np.float32).reshape(1, -1)
                if hasattr(self.preprocessor, 'transform'):
                    scaled_feat = self.preprocessor.transform(feat_array)
                else:
                    scaled_feat = feat_array

                preds = self.mlp_model.predict(scaled_feat, verbose=0)
                if preds.shape[-1] == 1:
                    prob_mastitis = float(preds[0][0]) if len(preds.shape) > 1 else float(preds[0])
                    prob_normal = 1.0 - prob_mastitis
                    label = 1 if prob_mastitis >= 0.5 else 0
                    confidence = float(prob_mastitis if label == 1 else prob_normal)
                    probabilities = [prob_normal, prob_mastitis]
                else:
                    label = int(np.argmax(preds[0]))
                    confidence = float(np.max(preds[0]))
                    probabilities = preds[0].tolist()

                return label, confidence, probabilities, "complete", []
            except Exception as e:
                print(f"[Numerical Model Error] Complete model inference failed: {e}")
                return None, None, None, "unavailable", []

        # Case 2 & 3: 1 or 2 features missing -> Missing-input-aware Model 2
        if 1 <= missing_count <= self.max_missing_features and self.is_missing_aware_model_ready:
            try:
                medians = self.missing_aware_preprocessor['train_medians']
                scaler = self.missing_aware_preprocessor['scaler']

                # Missingness mask: 0 for available, 1 for missing
                mask = [1.0 if i in missing_indices else 0.0 for i in range(6)]

                # Impute missing values with training medians (keep available values exact)
                imputed_values = [
                    float(medians[i]) if i in missing_indices else float(numerical_features[i])
                    for i in range(6)
                ]

                # Apply fitted scaler to the 6 values
                scaled_imputed = scaler.transform([imputed_values])[0]

                # Concatenate 6 scaled values + 6 missing indicators -> (1, 12)
                vec12 = np.concatenate([scaled_imputed, mask]).reshape(1, 12).astype(np.float32)

                preds = self.mlp_missing_aware_model.predict(vec12, verbose=0)
                if preds.shape[-1] == 1:
                    prob_mastitis = float(preds[0][0]) if len(preds.shape) > 1 else float(preds[0])
                    prob_normal = 1.0 - prob_mastitis
                    label = 1 if prob_mastitis >= 0.5 else 0
                    confidence = float(prob_mastitis if label == 1 else prob_normal)
                    probabilities = [prob_normal, prob_mastitis]
                else:
                    label = int(np.argmax(preds[0]))
                    confidence = float(np.max(preds[0]))
                    probabilities = preds[0].tolist()

                return label, confidence, probabilities, "missing_aware", missing_feature_names
            except Exception as e:
                print(f"[Numerical Model Error] Missing-aware model inference failed: {e}")
                return None, None, None, "unavailable", missing_feature_names

        # Case 4: 3 or more features missing (or required models not ready) -> Model 2 unavailable
        return None, None, None, "unavailable", missing_feature_names

    def predict_assisted(self, image_array, numerical_measurements=None, clinical_observations=None):
        """
        Multimodal inference handler supporting:
        - Complete numerical data (6/6 features -> Complete Model 2)
        - Partial numerical data (4/6 or 5/6 features -> Missing-Aware Model 2)
        - Image only / Insufficient numerical data (<= 3/6 features -> Model 1 only)
        """
        # 1. Model 1: Image prediction
        img_label, img_conf, img_probs = self.predict_image(image_array)

        # 2. Model 2: Numerical prediction
        num_label, num_conf, num_probs, num_model_type, missing_features = (None, None, None, "unavailable", [])
        has_numerical_input = (
            numerical_measurements is not None
            and isinstance(numerical_measurements, (list, tuple))
            and len(numerical_measurements) == 6
        )
        if has_numerical_input:
            num_label, num_conf, num_probs, num_model_type, missing_features = self.predict_numerical(
                numerical_measurements
            )

        # 3. Multimodal Fusion determination
        if img_label is not None and num_label is not None:
            # Both models provided predictions: soft-voting average
            img_mastitis_prob = img_probs[1] if isinstance(img_probs, list) and len(img_probs) > 1 else float(img_label)
            num_mastitis_prob = num_probs[1] if isinstance(num_probs, list) and len(num_probs) > 1 else float(num_label)
            fused_mastitis_prob = (img_mastitis_prob + num_mastitis_prob) / 2.0
            overall_label = 1 if fused_mastitis_prob >= 0.5 else 0
            overall_confidence = float(max(fused_mastitis_prob, 1.0 - fused_mastitis_prob))
            mode_used = "multimodal_image_numerical"
        elif img_label is not None:
            overall_label = img_label
            overall_confidence = img_conf
            mode_used = "image_only"
        else:
            overall_label = None
            overall_confidence = None
            mode_used = "development_placeholder"

        # Construct image prediction details
        img_mastitis_prob = (
            img_probs[1] if isinstance(img_probs, list) and len(img_probs) > 1
            else (float(img_label) if img_label is not None else None)
        )
        image_prediction_details = {
            "model": "ResNet-50 CNN (Model 1)",
            "status": "ready" if self.is_image_model_ready else "pending_training",
            "label": img_label,
            "prediction": ("Mastitis" if img_label == 1 else "Normal") if img_label is not None else None,
            "confidence": img_conf,
            "mastitis_confidence": img_mastitis_prob,
        }

        # Construct numerical prediction details
        numerical_prediction_details = None
        num_mastitis_prob = None
        model_2_used = bool(num_label is not None)

        if has_numerical_input:
            num_mastitis_prob = (
                num_probs[1] if isinstance(num_probs, list) and len(num_probs) > 1
                else (float(num_label) if num_label is not None else None)
            )
            model_name = (
                "MLP Missing-Aware Network (Model 2)"
                if num_model_type == "missing_aware"
                else "MLP Numerical Network (Model 2)"
            )
            numerical_prediction_details = {
                "model": model_name,
                "status": "ready" if model_2_used else "unavailable",
                "label": num_label,
                "prediction": ("Mastitis" if num_label == 1 else "Normal") if num_label is not None else None,
                "confidence": num_conf,
                "mastitis_confidence": num_mastitis_prob,
                "model_type": num_model_type,
                "missing_features": missing_features,
            }

        # Determine overall text prediction
        if overall_label is not None:
            final_prediction_str = "Mastitis" if overall_label == 1 else "Normal"
        else:
            final_prediction_str = "Model Pending Training"

        return {
            "prediction": final_prediction_str,
            "confidence": overall_confidence,
            "overall_label": overall_label,
            "mode": mode_used,
            "model_2_used": model_2_used,
            "numerical_analysis_available": model_2_used,
            "numerical_model_type": num_model_type,
            "missing_numerical_features": missing_features,
            "numerical_model_status": "used" if model_2_used else ("available" if has_numerical_input else "not_available"),
            "image_prediction": image_prediction_details,
            "numerical_prediction": numerical_prediction_details,
            "health_prediction": numerical_prediction_details,
            "clinical_observations": clinical_observations,
            "sources_used": [
                "udder_image",
                *(["numerical_measurements"] if model_2_used else []),
                *(["clinical_observations"] if clinical_observations else []),
            ]
        }
