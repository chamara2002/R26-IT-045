"""
Dual model training (CNN + Random Forest)
Trains both image and numerical models with optimized parameters.
"""
import sys
from pathlib import Path
import numpy as np

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def train_both_models():
    """Train CNN and Random Forest models."""
    from preprocessing.image_preprocessing import DatasetBuilder as ImageBuilder
    from preprocessing.numerical_preprocessing import NumericalDatasetBuilder
    from training.train_cnn_model import ImageModelTrainer
    from training.train_rf_model import HealthModelTrainer
    
    print("\n" + "="*70)
    print("MASTITIS DETECTION - DUAL MODEL TRAINING")
    print("="*70)

    # ========== IMAGE MODEL ==========
    print("\n[1/4] Loading image data...")
    image_builder = ImageBuilder()
    X_images, y_labels, img_paths, df = image_builder.load_dataset()
    X_img_train, X_img_val, X_img_test, y_img_train, y_img_val, y_img_test = \
        image_builder.split_data(X_images, y_labels)

    print(f"✓ Image data loaded: {len(X_images)} images")
    print(f"  Train: {len(X_img_train)}, Val: {len(X_img_val)}, Test: {len(X_img_test)}")

    # Train CNN
    print("\n[2/4] Training CNN image model...")
    image_trainer = ImageModelTrainer()
    cnn_model, cnn_metrics = image_trainer.train_full_pipeline(
        X_img_train, y_img_train, X_img_val, y_img_val, X_img_test, y_img_test,
        epochs=30, batch_size=16, freeze_base=True
    )

    # ========== NUMERICAL MODEL ==========
    print("\n[3/4] Loading numerical data...")
    num_builder = NumericalDatasetBuilder()
    X_num, y_num, feature_names = num_builder.load_and_prepare(balance=True)
    X_num_train, X_num_val, X_num_test, y_num_train, y_num_val, y_num_test = \
        num_builder.split_data(X_num, y_num)

    print(f"✓ Numerical data loaded: {len(X_num)} samples")
    print(f"  Train: {len(X_num_train)}, Val: {len(X_num_val)}, Test: {len(X_num_test)}")

    # Train Random Forest
    print("\n[4/4] Training Random Forest health model...")
    rf_trainer = HealthModelTrainer()
    rf_model, rf_metrics = rf_trainer.train_full_pipeline(
        X_num_train, y_num_train, X_num_val, y_num_val, X_num_test, y_num_test,
        feature_names=feature_names,
        n_estimators=200,
        max_depth=15
    )

    # ========== SUMMARY ==========
    print("\n" + "="*70)
    print("TRAINING COMPLETE")
    print("="*70)
    print(f"\nCNN Results:")
    print(f"  Accuracy: {cnn_metrics.get('test_accuracy', 'N/A'):.4f}" if isinstance(cnn_metrics.get('test_accuracy'), (int, float)) else f"  Accuracy: {cnn_metrics.get('test_accuracy', 'N/A')}")
    print(f"  Loss:     {cnn_metrics.get('test_loss', 'N/A'):.4f}" if isinstance(cnn_metrics.get('test_loss'), (int, float)) else f"  Loss: {cnn_metrics.get('test_loss', 'N/A')}")
    
    print(f"\nRandom Forest Results:")
    print(f"  Accuracy:  {rf_metrics.get('test_accuracy', 'N/A'):.4f}" if isinstance(rf_metrics.get('test_accuracy'), (int, float)) else f"  Accuracy: {rf_metrics.get('test_accuracy', 'N/A')}")
    print(f"  Precision: {rf_metrics.get('test_precision', 'N/A'):.4f}" if isinstance(rf_metrics.get('test_precision'), (int, float)) else f"  Precision: {rf_metrics.get('test_precision', 'N/A')}")
    print(f"  Recall:    {rf_metrics.get('test_recall', 'N/A'):.4f}" if isinstance(rf_metrics.get('test_recall'), (int, float)) else f"  Recall: {rf_metrics.get('test_recall', 'N/A')}")
    print(f"  F1-Score:  {rf_metrics.get('test_f1', 'N/A'):.4f}" if isinstance(rf_metrics.get('test_f1'), (int, float)) else f"  F1-Score: {rf_metrics.get('test_f1', 'N/A')}")

    print("\n✓ Both models trained and saved successfully!")
    print("  Models: models/cnn_image_model.h5, models/rf_health_model.pkl")
    print("  Metrics: results/cnn_metrics.json, results/rf_metrics.json")
    
    return cnn_model, rf_model, cnn_metrics, rf_metrics


if __name__ == '__main__':
    train_both_models()
