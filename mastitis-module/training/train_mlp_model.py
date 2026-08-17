"""
MLP Numerical Model Training for Mastitis Detection (Model 2).
Uses the 6 numerical features from dataset/mastitis_data.csv:
- Milk_Temperature
- Milk_pH
- Milk_Conductivity
- Somatic_Cell_Count
- Milk_Yield
- Clotting
"""
import sys
from pathlib import Path
import json
import numpy as np
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class MLPModelTrainer:
    """Train MLP neural network on numerical health metrics."""

    def __init__(self, model_dir='models', results_dir='results'):
        self.model_dir = Path(model_dir)
        self.results_dir = Path(results_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.results_dir.mkdir(exist_ok=True)
        self.model = None
        self.history = None
        self.feature_names = None
        self.test_metrics = {}

    def build_model(self, input_dim=6):
        """Build MLP architecture for numerical features."""
        from tensorflow import keras
        from tensorflow.keras import layers, models
        from tensorflow.keras.optimizers import Adam

        model = models.Sequential([
            layers.Input(shape=(input_dim,)),
            layers.Dense(64, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            layers.Dense(32, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(2, activation='softmax')  # Binary classification: Normal (0) / Mastitis (1)
        ])

        model.compile(
            optimizer=Adam(learning_rate=1e-3),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )

        self.model = model
        print(f"✓ MLP model built with input_dim={input_dim}")
        return self.model

    def train(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32):
        """Train the MLP model."""
        from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-6,
                verbose=1
            )
        ]

        print(f"Training MLP on {len(X_train)} samples with {X_train.shape[1]} features")
        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        print("✓ MLP Training complete")
        return self.history

    def evaluate(self, X_test, y_test):
        """Evaluate MLP model on test set."""
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

        predictions = self.model.predict(X_test, verbose=0)
        y_pred = np.argmax(predictions, axis=1)

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

        print(f"\nMLP Test Metrics:")
        print(f"  Accuracy:  {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1-Score:  {f1:.4f}")

        return self.test_metrics

    def plot_training_history(self):
        """Plot MLP training curves."""
        if self.history is None:
            return

        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        if 'accuracy' in self.history.history:
            axes[0].plot(self.history.history['accuracy'], label='Train Accuracy')
        if 'val_accuracy' in self.history.history:
            axes[0].plot(self.history.history['val_accuracy'], label='Val Accuracy')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Accuracy')
        axes[0].set_title('MLP Accuracy')
        axes[0].legend()
        axes[0].grid(True)

        if 'loss' in self.history.history:
            axes[1].plot(self.history.history['loss'], label='Train Loss')
        if 'val_loss' in self.history.history:
            axes[1].plot(self.history.history['val_loss'], label='Val Loss')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Loss')
        axes[1].set_title('MLP Loss')
        axes[1].legend()
        axes[1].grid(True)

        plt.tight_layout()
        plt.savefig(str(self.results_dir / 'mlp_training_history.png'), dpi=100, bbox_inches='tight')
        plt.close()

    def save_model(self, filename='mlp_numerical_model.keras'):
        """Save trained MLP model."""
        path = self.model_dir / filename
        self.model.save(str(path))
        print(f"✓ MLP Model saved to {path}")
        return path

    def save_metrics(self, filename='mlp_metrics.json'):
        """Save metrics to JSON."""
        path = self.results_dir / filename
        with open(path, 'w') as f:
            json.dump(self.test_metrics, f, indent=2)
        print(f"✓ Metrics saved to {path}")
        return path

    def train_full_pipeline(self, X_train, y_train, X_val, y_val, X_test, y_test,
                            feature_names=None, epochs=50, batch_size=32):
        """Complete training pipeline for MLP."""
        print("\n" + "="*70)
        print("MLP NUMERICAL MODEL TRAINING")
        print("="*70)

        self.feature_names = feature_names

        # 1. Build model
        print("\n[1/4] Building MLP model...")
        self.build_model(input_dim=X_train.shape[1])

        # 2. Train
        print("\n[2/4] Training MLP model...")
        self.train(X_train, y_train, X_val, y_val, epochs=epochs, batch_size=batch_size)

        # 3. Evaluate
        print("\n[3/4] Evaluating on test set...")
        self.evaluate(X_test, y_test)

        # 4. Save & Plot
        print("\n[4/4] Saving model and metrics...")
        self.plot_training_history()
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
    trainer = MLPModelTrainer()
    trainer.train_full_pipeline(
        X_train, y_train, X_val, y_val, X_test, y_test,
        feature_names=feature_names,
        epochs=50,
        batch_size=32
    )
    # Save preprocessor
    builder.save_preprocessor('models/numerical_preprocessor.pkl')
