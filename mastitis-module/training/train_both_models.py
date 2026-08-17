"""
Dual model training (Model 1: ResNet50 CNN + Model 2: MLP Numerical)
Trains both image and numerical models with standardized datasets and parameters.
"""
import sys
from pathlib import Path

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def train_both_models():
    """Train CNN (Model 1) and MLP (Model 2) models."""
    from preprocessing.image_preprocessing import DatasetBuilder as ImageBuilder
    from preprocessing.numerical_preprocessing import NumericalDatasetBuilder
    from training.train_cnn_model import ImageModelTrainer
    from training.train_mlp_model import MLPModelTrainer
    
    print("\n" + "="*70)
    print("MASTITIS DETECTION - DUAL MODEL TRAINING (CNN + MLP)")
    print("="*70)

    # ========== MODEL 1: IMAGE MODEL (CNN) ==========
    print("\n[1/4] Loading image data from dataset/train/...")
    image_builder = ImageBuilder()
    X_images, y_labels, img_paths, df = image_builder.load_dataset()
    X_img_train, X_img_val, X_img_test, y_img_train, y_img_val, y_img_test = \
        image_builder.split_data(X_images, y_labels)

    print(f"✓ Image data loaded: {len(X_images)} images")
    print(f"  Train: {len(X_img_train)}, Val: {len(X_img_val)}, Test: {len(X_img_test)}")

    print("\n[2/4] Training Model 1 (CNN ResNet-50)...")
    image_trainer = ImageModelTrainer()
    cnn_model, cnn_metrics = image_trainer.train_full_pipeline(
        X_img_train, y_img_train, X_img_val, y_img_val, X_img_test, y_img_test,
        epochs=30, batch_size=16, freeze_base=True
    )

    # ========== MODEL 2: NUMERICAL MODEL (MLP) ==========
    print("\n[3/4] Loading numerical data from dataset/mastitis_data.csv...")
    num_builder = NumericalDatasetBuilder()
    X_num, y_num, feature_names = num_builder.load_and_prepare(balance=True)
    X_num_train, X_num_val, X_num_test, y_num_train, y_num_val, y_num_test = \
        num_builder.split_data(X_num, y_num)

    print(f"✓ Numerical data loaded: {len(X_num)} samples")
    print(f"  Train: {len(X_num_train)}, Val: {len(X_num_val)}, Test: {len(X_num_test)}")

    print("\n[4/4] Training Model 2 (MLP Numerical)...")
    mlp_trainer = MLPModelTrainer()
    mlp_model, mlp_metrics = mlp_trainer.train_full_pipeline(
        X_num_train, y_num_train, X_num_val, y_num_val, X_num_test, y_num_test,
        feature_names=feature_names,
        epochs=50,
        batch_size=32
    )

    # Save preprocessor
    num_builder.save_preprocessor('models/numerical_preprocessor.pkl')

    # ========== SUMMARY ==========
    print("\n" + "="*70)
    print("TRAINING COMPLETE")
    print("="*70)
    print(f"\nModel 1 (CNN Image) Results:")
    print(f"  Accuracy: {cnn_metrics.get('test_accuracy', 'N/A')}")
    print(f"  Loss:     {cnn_metrics.get('test_loss', 'N/A')}")
    
    print(f"\nModel 2 (MLP Numerical) Results:")
    print(f"  Accuracy:  {mlp_metrics.get('test_accuracy', 'N/A')}")
    print(f"  Precision: {mlp_metrics.get('test_precision', 'N/A')}")
    print(f"  Recall:    {mlp_metrics.get('test_recall', 'N/A')}")
    print(f"  F1-Score:  {mlp_metrics.get('test_f1', 'N/A')}")

    print("\n✓ Both models trained and saved successfully!")
    print("  Model 1: models/cnn_image_model.keras")
    print("  Model 2: models/mlp_numerical_model.keras")
    print("  Preprocessor: models/numerical_preprocessor.pkl")
    
    return cnn_model, mlp_model, cnn_metrics, mlp_metrics


if __name__ == '__main__':
    train_both_models()
