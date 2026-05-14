"""
Combined training script for both CNN and Random Forest models.
Wrapper that handles imports from reorganized module structure.
"""
import sys
from pathlib import Path
import numpy as np

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

def train_both_models():
    """Train CNN and Random Forest models."""
    print("\n" + "="*70)
    print("MASTITIS DETECTION - DUAL MODEL TRAINING")
    print("="*70)

    # Import from reorganized modules
    from preprocessing.image_preprocessing import DatasetBuilder as ImageBuilder
    from preprocessing.numerical_preprocessing import NumericalDatasetBuilder
    from training.train_cnn_model import ImageModelTrainer
    from training.train_rf_model import HealthModelTrainer

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
    image_trainer.save_metrics()

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
    health_trainer = HealthModelTrainer()
    rf_model, rf_metrics = health_trainer.train_full_pipeline(
        X_num_train, y_num_train, X_num_val, y_num_val, X_num_test, y_num_test,
        feature_names=feature_names,
        n_estimators=200, max_depth=15
    )
    health_trainer.save_metrics()

    # Summary
    print("\n" + "="*70)
    print("TRAINING SUMMARY")
    print("="*70)
    print(f"\nCNN Image Model:")
    cnn_loss = cnn_metrics.get('test_loss')
    cnn_acc = cnn_metrics.get('test_accuracy')
    
    # Handle NaN values safely
    try:
        if cnn_loss is not None and isinstance(cnn_loss, (int, float)) and not np.isnan(cnn_loss):
            print(f"  Test Loss: {cnn_loss:.4f}")
        else:
            print(f"  Test Loss: N/A")
    except (TypeError, ValueError):
        print(f"  Test Loss: N/A")
    
    try:
        if cnn_acc is not None and isinstance(cnn_acc, (int, float)) and not np.isnan(cnn_acc):
            print(f"  Test Accuracy: {cnn_acc:.4f}")
        else:
            print(f"  Test Accuracy: N/A")
    except (TypeError, ValueError):
        print(f"  Test Accuracy: N/A")

    print(f"\nRandom Forest Health Model:")
    rf_acc = rf_metrics.get('test_accuracy')
    rf_prec = rf_metrics.get('test_precision')
    rf_rec = rf_metrics.get('test_recall')
    rf_f1 = rf_metrics.get('test_f1')
    
    if rf_acc is not None:
        print(f"  Test Accuracy: {rf_acc:.4f}")
    else:
        print(f"  Test Accuracy: N/A")
    if isinstance(rf_prec, (int, float)):
        print(f"  Test Precision: {rf_prec:.4f}")
    else:
        print(f"  Test Precision: {rf_prec}")
    if isinstance(rf_rec, (int, float)):
        print(f"  Test Recall: {rf_rec:.4f}")
    else:
        print(f"  Test Recall: {rf_rec}")
    if isinstance(rf_f1, (int, float)):
        print(f"  Test F1-Score: {rf_f1:.4f}")
    else:
        print(f"  Test F1-Score: {rf_f1}")

    print(f"\n✓ Both models trained successfully!")
    print(f"  Models saved in: models/")
    print(f"  Metrics saved in: results/")
    print(f"  Preprocessors saved for inference")

    # Save preprocessors to models folder
    num_builder.save_preprocessor('models/numerical_preprocessor.pkl')

    return cnn_model, rf_model, num_builder


if __name__ == '__main__':
    try:
        cnn_model, rf_model, num_preprocessor = train_both_models()
        print("\n✓ All models ready for inference!")
    except Exception as e:
        print(f"\n✗ Error during training: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
