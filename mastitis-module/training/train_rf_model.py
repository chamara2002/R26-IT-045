"""
Random Forest Model Training for Mastitis Detection
Uses health metrics (temperature, milk yield, etc.) for prediction.
"""
import sys
from pathlib import Path
import json
import numpy as np
import matplotlib.pyplot as plt
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class HealthModelTrainer:
    """Train Random Forest model on health metrics."""
    
    def __init__(self, model_dir='models', results_dir='results'):
        self.model_dir = Path(model_dir)
        self.results_dir = Path(results_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.results_dir.mkdir(exist_ok=True)
        self.model = None
        self.feature_names = None
        self.test_metrics = {}
        
    def build_model(self, n_estimators=200, max_depth=15):
        """Build Random Forest classifier."""
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1,
            verbose=0
        )
        print(f"✓ RF model built: {n_estimators} estimators, max_depth={max_depth}")
        return self.model
    
    def train(self, X_train, y_train):
        """Train the Random Forest model."""
        print(f"Training on {len(X_train)} samples with {X_train.shape[1]} features")
        self.model.fit(X_train, y_train)
        print("✓ Training complete")
        return self.model
    
    def evaluate(self, X_test, y_test, y_pred=None):
        """Evaluate model on test set."""
        if y_pred is None:
            y_pred = self.model.predict(X_test)
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        
        self.test_metrics = {
            'test_accuracy': float(accuracy),
            'test_precision': float(precision),
            'test_recall': float(recall),
            'test_f1': float(f1)
        }
        
        print(f"\nTest Metrics:")
        print(f"  Accuracy:  {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        
        return self.test_metrics
    
    def plot_feature_importance(self, top_n=10):
        """Plot feature importance."""
        if self.model is None:
            print("Model not trained yet")
            return
        
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[::-1][:top_n]
        
        feature_names = self.feature_names if self.feature_names else [f'Feature {i}' for i in range(len(importances))]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.barh(range(len(indices)), importances[indices])
        ax.set_yticks(range(len(indices)))
        ax.set_yticklabels([feature_names[i] for i in indices])
        ax.set_xlabel('Importance')
        ax.set_title('Top 10 Feature Importance (Random Forest)')
        plt.tight_layout()
        
        plt.savefig(str(self.results_dir / 'rf_feature_importance.png'), dpi=100, bbox_inches='tight')
        print(f"✓ Feature importance plot saved")
        plt.close()
    
    def save_model(self, filename='rf_health_model.pkl'):
        """Save trained model."""
        path = self.model_dir / filename
        with open(path, 'wb') as f:
            pickle.dump(self.model, f)
        print(f"✓ Model saved to {path}")
        return path
    
    def save_metrics(self, filename='rf_metrics.json'):
        """Save metrics to JSON."""
        path = self.results_dir / filename
        with open(path, 'w') as f:
            json.dump(self.test_metrics, f, indent=2)
        print(f"✓ Metrics saved to {path}")
        return path
    
    def train_full_pipeline(self, X_train, y_train, X_val, y_val, X_test, y_test,
                           feature_names=None, n_estimators=200, max_depth=15):
        """Complete training pipeline."""
        print("\n" + "="*70)
        print("RANDOM FOREST HEALTH MODEL TRAINING")
        print("="*70)
        
        self.feature_names = feature_names
        
        # Build model
        print("\n[1/4] Building model...")
        self.build_model(n_estimators=n_estimators, max_depth=max_depth)
        
        # Train
        print("\n[2/4] Training model...")
        self.train(X_train, y_train)
        
        # Evaluate
        print("\n[3/4] Evaluating on test set...")
        self.evaluate(X_test, y_test)
        
        # Save & Plot
        print("\n[4/4] Saving model and metrics...")
        self.plot_feature_importance(top_n=10)
        self.save_model()
        self.save_metrics()
        
        return self.model, self.test_metrics


if __name__ == '__main__':
    from preprocessing.numerical_preprocessing import NumericalDatasetBuilder
    
    # Load data
    builder = NumericalDatasetBuilder()
    X, y, feature_names = builder.load_and_prepare(balance=True)
    X_train, X_val, X_test, y_train, y_val, y_test = builder.split_data(X, y)
    
    # Train
    trainer = HealthModelTrainer()
    trainer.train_full_pipeline(
        X_train, y_train, X_val, y_val, X_test, y_test,
        feature_names=feature_names,
        n_estimators=200,
        max_depth=15
    )
