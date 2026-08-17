"""
Inference runner and diagnostic CLI for CattleSense Mastitis Module.
Tests Model 1 (CNN Image Model) and verifies Model 2 / Fusion readiness.
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

    # 1. Model 1 (CNN Image Model)
    print("\n[Model 1 - ResNet-50 CNN]")
    if config.CNN_MODEL_PATH.exists():
        size_mb = config.CNN_MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"  ✓ Active Model: {config.CNN_MODEL_PATH.name} ({size_mb:.1f} MB) - READY")
    else:
        print(f"  ✗ Model not found at {config.CNN_MODEL_PATH}")

    # 2. Model 2 (Complete-Input MLP Model)
    print("\n[Model 2 - Complete-Input MLP Model]")
    if config.MLP_MODEL_PATH.exists():
        size_mb = config.MLP_MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"  ✓ Active Complete Model: {config.MLP_MODEL_PATH.name} ({size_mb:.2f} MB) - READY")
    else:
        print(f"  ✗ Complete Model not found at {config.MLP_MODEL_PATH}")

    # 3. Model 2 (Missing-Input-Aware MLP Model)
    print("\n[Model 2 - Missing-Input-Aware MLP Model]")
    if config.MLP_MISSING_AWARE_MODEL_PATH.exists():
        size_mb = config.MLP_MISSING_AWARE_MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"  ✓ Active Missing-Aware Model: {config.MLP_MISSING_AWARE_MODEL_PATH.name} ({size_mb:.2f} MB) - READY")
    else:
        print(f"  ✗ Missing-Aware Model not found at {config.MLP_MISSING_AWARE_MODEL_PATH}")

    # 4. Numerical Preprocessors
    print("\n[Numerical Preprocessors]")
    if config.PREPROCESSOR_PATH.exists():
        size_kb = config.PREPROCESSOR_PATH.stat().st_size / 1024
        print(f"  ✓ Complete Scaler: {config.PREPROCESSOR_PATH.name} ({size_kb:.1f} KB) - READY")
    if config.MISSING_AWARE_PREPROCESSOR_PATH.exists():
        size_kb = config.MISSING_AWARE_PREPROCESSOR_PATH.stat().st_size / 1024
        print(f"  ✓ Missing-Aware Preprocessor: {config.MISSING_AWARE_PREPROCESSOR_PATH.name} ({size_kb:.1f} KB) - READY")

    # 4. Datasets
    print("\n[Datasets]")
    train_dir = config.DATASET_DIR / "train"
    if train_dir.exists():
        mastitis_imgs = len(list((train_dir / "mastitis").glob("*.*")))
        normal_imgs = len(list((train_dir / "normal").glob("*.*")))
        print(f"  ✓ Image Dataset: {mastitis_imgs} Mastitis, {normal_imgs} Normal ({mastitis_imgs + normal_imgs} total)")
    else:
        print("  ✗ Image dataset directory not found")

    csv_path = config.DATASET_DIR / "mastitis_data.csv"
    if csv_path.exists():
        print(f"  ✓ Numerical Dataset: {csv_path.name} ({csv_path.stat().st_size / 1024:.1f} KB)")
    else:
        print("  ✗ Numerical CSV not found")


def run_prediction_demo():
    """Run an inference demo using the active PredictionPipeline."""
    show_module_status()

    print("\n" + "=" * 70)
    print("RUNNING INFERENCE DEMO")
    print("=" * 70)

    try:
        pipeline = PredictionPipeline()

        # Load a sample image from dataset or generate a dummy RGB image
        config = get_config()
        sample_img_path = None
        sample_candidates = list((config.DATASET_DIR / "train" / "mastitis").glob("*.jpg"))
        if sample_candidates:
            sample_img_path = sample_candidates[0]

        if sample_img_path and sample_img_path.exists():
            print(f"\n[1/3] Loading sample udder image: {sample_img_path.name}")
            raw_bgr = cv2.imread(str(sample_img_path))
            raw_rgb = cv2.cvtColor(raw_bgr, cv2.COLOR_BGR2RGB)
            test_image = cv2.resize(raw_rgb, config.IMAGE_SIZE)
        else:
            print("\n[1/3] Generating synthetic udder image array (224x224x3)...")
            test_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)

        # Sample 6 numerical features: [Milk_Temp, Milk_pH, Milk_Cond, SCC, Milk_Yield, Clotting]
        test_numerical = [38.7, 6.85, 5.8, 350.0, 16.5, 0.0]
        print(f"[2/3] Preparing numerical health measurements: {test_numerical}")

        # Sample clinical observations
        test_clinical = {
            "udder_swelling": "Yes",
            "udder_warmth": "Increased",
            "udder_pain": "Yes",
            "milk_appearance": "Normal",
            "appetite": "Normal",
        }

        print("[3/3] Running prediction pipeline...")
        from tensorflow.keras.applications.resnet import preprocess_input
        preprocessed_img = preprocess_input(test_image.astype(np.float32).copy())

        result = pipeline.predict_assisted(
            image_array=preprocessed_img,
            numerical_measurements=test_numerical,
            clinical_observations=test_clinical,
        )

        print("\n" + "=" * 70)
        print("PREDICTION RESULT")
        print("=" * 70)
        print(f"\n🎯 Final Prediction: {result['prediction']}")
        print(f"📊 Confidence:       {result['confidence']:.2%}" if result['confidence'] else "📊 Confidence: N/A")
        print(f"🔄 Execution Mode:   {result['mode']}")
        print(f"📡 Sources Used:     {', '.join(result['sources_used'])}")

        print("\n📈 Model Details:")
        img_pred = result.get('image_prediction', {})
        print(f"  • Model 1 (CNN):       {img_pred.get('prediction')} (Status: {img_pred.get('status')}, Conf: {img_pred.get('confidence', 0):.2%})")

        num_pred = result.get('numerical_prediction')
        if num_pred:
            print(f"  • Model 2 (MLP):       {num_pred.get('prediction')} (Status: {num_pred.get('status')})")
        else:
            print(f"  • Model 2 (MLP):       Status: Pending Training")

        print("\n✅ Inference demo completed successfully!\n")
        return result

    except Exception as e:
        print(f"\n⚠️  Inference error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    run_prediction_demo()
