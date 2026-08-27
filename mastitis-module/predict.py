"""
Inference runner and diagnostic CLI for CattleSense Mastitis Module.
Tests Model 1 (CNN Image Model) and verifies Model 2 (Logistic Regression Pipeline) readiness.
"""
import sys
from pathlib import Path
import json
import numpy as np
import cv2

# Add parent directory for imports
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config.config import get_config
from inference.prediction_pipeline import PredictionPipeline


def show_module_status():
    """Display status of models, dataset, and system artifacts."""
    config = get_config()
    print("\n" + "=" * 70)
    print("CATTLESENSE MASTITIS MODULE - STATUS CHECK")
    print("=" * 70)

    # 1. Model 1 (MobileNetV2 Image Model)
    print("\n[Model 1 - MobileNetV2 (Stage 1, frozen backbone)]")
    if config.CNN_MODEL_PATH.exists():
        size_mb = config.CNN_MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"  ✓ Active Model: {config.CNN_MODEL_PATH.name} ({size_mb:.1f} MB) - READY")
    else:
        print(f"  ✗ Model not found at {config.CNN_MODEL_PATH}")

    if config.MODEL_1_THRESHOLD_PATH.exists():
        with open(config.MODEL_1_THRESHOLD_PATH) as f:
            thresh_data = json.load(f)
        print(f"  ✓ Decision Threshold: {thresh_data.get('threshold', 0.50)} (Validation Suggested: {thresh_data.get('validation_suggested', 0.45)})")

    if config.MODEL_1_CLASS_NAMES_PATH.exists():
        with open(config.MODEL_1_CLASS_NAMES_PATH) as f:
            classes = json.load(f)
        print(f"  ✓ Class Mapping: {classes}")

    if config.METRICS_PATH.exists():
        with open(config.METRICS_PATH) as f:
            m = json.load(f)
        print(f"  ✓ Metrics: Accuracy={m.get('accuracy', 0)*100:.1f}%, F1={m.get('f1', 0)*100:.1f}%, ROC-AUC={m.get('roc_auc', 0):.4f}")


def run_prediction_demo():
    """Run an inference demo using the active PredictionPipeline."""
    show_module_status()

    print("\n" + "=" * 70)
    print("RUNNING INFERENCE DEMO")
    print("=" * 70)

    try:
        pipeline = PredictionPipeline()

        # Sample 5 numerical features: [Milk_Temperature, Milk_pH, Milk_Conductivity, Milk_Yield, Clotting]
        test_numerical = {
            "Milk_Temperature": 36.2,
            "Milk_pH": 6.68,
            "Milk_Conductivity": 4.85,
            "Milk_Yield": 18.5,
            "Clotting": 0
        }
        print(f"\n[1/2] Preparing numerical milk measurements: {test_numerical}")

        # Sample clinical observations
        test_clinical = {
            "udder_swelling": "No",
            "udder_warmth": "Normal",
            "udder_pain": "No",
            "milk_appearance": "Normal",
            "appetite": "Normal",
        }

        print("[2/2] Running prediction pipeline...")
        result = pipeline.predict_assisted(
            image_array=None,
            numerical_measurements=test_numerical,
            clinical_observations=test_clinical,
        )

        print("\n" + "=" * 70)
        print("PREDICTION RESULT")
        print("=" * 70)
        print(f"\n🎯 Final Prediction: {result['prediction']}")
        print(f"📊 Confidence:       {result['confidence']:.2%}" if result['confidence'] else "📊 Confidence: N/A")
        print(f"🟢 Normal Prob:      {result.get('normal_probability', 0):.4f}")
        print(f"🔴 Mastitis Prob:    {result.get('mastitis_probability', 0):.4f}")
        print(f"🔄 Execution Mode:   {result['mode']}")
        print(f"📡 Sources Used:     {', '.join(result['sources_used'])}")

        print("\n📈 Model Details:")
        num_pred = result.get('numerical_prediction')
        if num_pred:
            print(f"  • Model 2 (Decision Tree): {num_pred.get('prediction')} (Status: {num_pred.get('status')})")

        print("\n✅ Inference demo completed successfully!\n")
        return result

    except Exception as e:
        print(f"\n⚠️  Inference error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    run_prediction_demo()
