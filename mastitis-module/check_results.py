"""
Quick summary of training results without TensorFlow initialization.
"""
import json
from pathlib import Path

def show_training_results():
    """Display training results from saved metrics."""
    results_dir = Path('results')
    
    print("\n" + "="*70)
    print("MASTITIS DETECTION - TRAINING SUMMARY")
    print("="*70)
    
    # Load CNN metrics
    cnn_metrics_file = results_dir / 'cnn_metrics.json'
    if cnn_metrics_file.exists():
        with open(cnn_metrics_file) as f:
            cnn_metrics = json.load(f)
        print("\n✅ CNN Image Model Results:")
        print(f"  Test Accuracy:  {cnn_metrics.get('test_accuracy', 'N/A')}")
        print(f"  Test Loss:      {cnn_metrics.get('test_loss', 'N/A')}")
        print(f"  Epochs Trained: {cnn_metrics.get('epochs_trained', 'N/A')}")
    else:
        print("\n⚠️  CNN metrics not found")
    
    # Load RF metrics
    rf_metrics_file = results_dir / 'rf_metrics.json'
    if rf_metrics_file.exists():
        with open(rf_metrics_file) as f:
            rf_metrics = json.load(f)
        print("\n✅ Random Forest Health Model Results:")
        print(f"  Test Accuracy:  {rf_metrics.get('test_accuracy', 'N/A')}")
        print(f"  Test Precision: {rf_metrics.get('test_precision', 'N/A')}")
        print(f"  Test Recall:    {rf_metrics.get('test_recall', 'N/A')}")
        print(f"  Test F1-Score:  {rf_metrics.get('test_f1', 'N/A')}")
    else:
        print("\n⚠️  Random Forest metrics not found")
    
    # Check model files
    models_dir = Path('models')
    print("\n✅ Model Files:")
    for model_file in sorted(models_dir.glob('*')):
        size_mb = model_file.stat().st_size / (1024 * 1024)
        print(f"  ✓ {model_file.name} ({size_mb:.1f} MB)")
    
    print("\n" + "="*70)
    print("✨ Training Complete and Ready for Inference!")
    print("="*70)


if __name__ == '__main__':
    show_training_results()
