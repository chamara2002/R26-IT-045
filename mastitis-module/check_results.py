"""
System verification and health status report for CattleSense Mastitis Module.
Quickly checks files, models, datasets, configs, and directory integrity without heavy loading.
"""
import sys
from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config.config import get_config


def run_system_check():
    """Verify all components of the Mastitis Module."""
    config = get_config()
    all_ok = True

    print("\n" + "=" * 70)
    print("CATTLESENSE MASTITIS MODULE - SYSTEM HEALTH & ASSET CHECK")
    print("=" * 70)

    # 1. Check Model 1
    print("\n1. MODEL 1 (MobileNetV2 Image Model)")
    if config.CNN_MODEL_PATH.exists():
        size_mb = config.CNN_MODEL_PATH.stat().st_size / (1024 * 1024)
        print(f"   ✓ [FOUND] {config.CNN_MODEL_PATH.name} ({size_mb:.1f} MB)")
        print(f"     Path: {config.CNN_MODEL_PATH}")
    else:
        print(f"   ✗ [MISSING] {config.CNN_MODEL_PATH}")
        all_ok = False

    if config.MODEL_1_THRESHOLD_PATH.exists():
        with open(config.MODEL_1_THRESHOLD_PATH) as f:
            t = json.load(f)
        print(f"   ✓ [CONFIG] threshold.json: {t.get('threshold')}")
    else:
        print(f"   ✗ [MISSING] threshold.json")
        all_ok = False

    if config.MODEL_1_CLASS_NAMES_PATH.exists():
        with open(config.MODEL_1_CLASS_NAMES_PATH) as f:
            c = json.load(f)
        print(f"   ✓ [CONFIG] class_names.json: {c}")
    else:
        print(f"   ✗ [MISSING] class_names.json")
        all_ok = False

    if config.MODEL_1_PREPROCESSING_CONFIG_PATH.exists():
        with open(config.MODEL_1_PREPROCESSING_CONFIG_PATH) as f:
            p = json.load(f)
        print(f"   ✓ [CONFIG] preprocessing_config.json: {p.get('resize_strategy')} {p.get('target_size')}")
    else:
        print(f"   ✗ [MISSING] preprocessing_config.json")
        all_ok = False

    if config.METRICS_PATH.exists():
        with open(config.METRICS_PATH) as f:
            m = json.load(f)
        print(f"   ✓ [METRICS] metrics.json: Accuracy={m.get('accuracy', 0)*100:.1f}%, F1={m.get('f1', 0)*100:.1f}%, ROC-AUC={m.get('roc_auc', 0):.4f}")

    # 2. Check Model 2 (Decision Tree Classifier)
    print("\n2. MODEL 2 (Decision Tree Classifier)")
    if config.MODEL_2_PATH.exists():
        size_kb = config.MODEL_2_PATH.stat().st_size / 1024
        print(f"   ✓ [FOUND] {config.MODEL_2_PATH.name} ({size_kb:.1f} KB)")
        print(f"     Path: {config.MODEL_2_PATH}")
    else:
        print(f"   ✗ [MISSING] Model 2 at {config.MODEL_2_PATH}")
        all_ok = False

    if config.METADATA_PATH.exists():
        with open(config.METADATA_PATH) as f:
            meta = json.load(f)
        features = meta.get('features') or meta.get('features_required', [])
        print(f"   ✓ [FOUND] Metadata: {meta.get('model_type')} ({len(features)} features: {', '.join(features)})")
    else:
        print(f"   ✗ [MISSING] Metadata at {config.METADATA_PATH}")
        all_ok = False

    # 4. Check Datasets
    print("\n4. DATASETS")
    img_train_dir = config.DATASET_DIR / "train"
    if img_train_dir.exists():
        m_count = len(list((img_train_dir / "mastitis").glob("*.*")))
        n_count = len(list((img_train_dir / "normal").glob("*.*")))
        print(f"   ✓ [IMAGE DATASET] {m_count} Mastitis images, {n_count} Normal images ({m_count + n_count} total)")
    else:
        print(f"   ✗ [MISSING] Image dataset at {img_train_dir}")
        all_ok = False

    csv_path = config.DATASET_DIR / "cow_milk_mastitis_dataset.csv"
    if not csv_path.exists():
        csv_path = config.DATASET_DIR / "mastitis_data.csv"
    if csv_path.exists():
        import pandas as pd
        df = pd.read_csv(csv_path)
        print(f"   ✓ [NUMERICAL DATASET] {csv_path.name} ({len(df)} rows, {len(df.columns)} columns)")
        print(f"     Columns: {', '.join(df.columns.tolist())}")
    else:
        print(f"   ✗ [MISSING] CSV dataset at {csv_path}")
        all_ok = False

    # 5. Check Directories & Config
    print("\n5. ARCHITECTURE & FOLDERS")
    required_dirs = ["api", "config", "dataset", "inference", "models", "preprocessing", "training", "utils", "uploads/heatmaps"]
    for d in required_dirs:
        p = BASE_DIR / d
        if p.exists():
            print(f"   ✓ [DIR] {d}/")
        else:
            print(f"   ✗ [DIR MISSING] {d}/")
            all_ok = False

    print("\n" + "=" * 70)
    if all_ok:
        print("✨ SYSTEM STATUS: ALL ACTIVE MODULES HEALTHY & RESEARCH-READY")
    else:
        print("⚠️  SYSTEM STATUS: SOME REQUIRED ASSETS ARE MISSING")
    print("=" * 70 + "\n")
    return all_ok


if __name__ == "__main__":
    run_system_check()
