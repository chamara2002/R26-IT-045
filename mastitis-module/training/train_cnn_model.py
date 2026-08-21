"""
CNN Image Model Training for Mastitis Detection
Uses ResNet50 transfer learning with fine-tuning.
"""
import sys
from pathlib import Path
import json
import numpy as np
import matplotlib.pyplot as plt
from collections import Counter
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.applications.resnet import preprocess_input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint, TensorBoard
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class ImageModelTrainer:
    """Train CNN model for image classification."""
    
    def __init__(self, model_dir='models', results_dir='results'):
        self.model_dir = Path(model_dir)
        self.results_dir = Path(results_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.results_dir.mkdir(exist_ok=True)
        self.model = None
        self.history = None
        self.test_metrics = {}
        
    def build_model(self, input_shape=(224, 224, 3)):
        """Build ResNet50 transfer learning model."""
        # Load pre-trained ResNet50
        base_model = ResNet50(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Build model
        model = models.Sequential([
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.5),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(2, activation='softmax')  # Binary classification
        ])
        
        # Compile with loss stable for small batches
        model.compile(
            loss='sparse_categorical_crossentropy',
            optimizer=Adam(learning_rate=1e-4),
            metrics=['accuracy']
        )
        
        self.model = model
        return model

    def _augment_image(self, image):
        """Apply lightweight augmentation to oversampled images."""
        augmented = image.copy()

        if np.random.rand() > 0.5:
            augmented = np.fliplr(augmented)

        if np.random.rand() > 0.5:
            augmented = np.flipud(augmented)

        brightness = np.random.uniform(0.85, 1.15)
        augmented = np.clip(augmented * brightness, -255.0, 255.0)

        return augmented

    def _balance_training_data(self, X_train, y_train):
        """Oversample minority classes so the CNN does not collapse to the majority label."""
        class_counts = Counter(y_train.tolist())
        if len(class_counts) < 2:
            return X_train, y_train, None

        target_count = max(class_counts.values())
        balanced_images = []
        balanced_labels = []

        for class_label in sorted(class_counts.keys()):
            class_indices = np.where(y_train == class_label)[0]
            class_images = X_train[class_indices]

            for image in class_images:
                balanced_images.append(image)
                balanced_labels.append(class_label)

            deficit = target_count - len(class_images)
            if deficit > 0:
                sampled_indices = np.random.choice(class_indices, size=deficit, replace=True)
                for sampled_index in sampled_indices:
                    balanced_images.append(self._augment_image(X_train[sampled_index]))
                    balanced_labels.append(class_label)

        balanced_X = np.array(balanced_images, dtype=np.float32)
        balanced_y = np.array(balanced_labels, dtype=np.int32)

        print("✓ Balanced training data for CNN:")
        for class_label in sorted(class_counts.keys()):
            print(f"  Class {class_label}: {target_count} samples")

        return balanced_X, balanced_y, None
    
    def train(self, X_train, y_train, X_val, y_val, epochs=30, batch_size=16, class_weight=None):
        """Train the model."""
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=3,
                min_lr=1e-7,
                verbose=1
            ),
            ModelCheckpoint(
                str(self.model_dir / 'cnn_image_model_best.keras'),
                monitor='val_accuracy',
                save_best_only=True,
                verbose=0
            ),
            TensorBoard(
                log_dir=str(self.results_dir / 'logs' / 'cnn_model' / 'train'),
                histogram_freq=0,  # Disabled to avoid cond() errors
                write_graph=True
            )
        ]
        
        print(f"Training on {len(X_train)} samples with batch_size={batch_size}")
        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            class_weight=class_weight,
            verbose=1
        )
        
        return self.history
    
    def evaluate(self, X_test, y_test):
        """Evaluate model on test set."""
        results = self.model.evaluate(X_test, y_test, return_dict=True)
        self.test_metrics = {
            'test_loss': float(results.get('loss', 0)),
            'test_accuracy': float(results.get('accuracy', 0))
        }
        print(f"\nTest Accuracy: {self.test_metrics['test_accuracy']:.4f}")
        print(f"Test Loss: {self.test_metrics['test_loss']:.4f}")
        return self.test_metrics
    
    def plot_training_history(self):
        """Plot training history with adaptive metric handling."""
        if self.history is None:
            print("No training history to plot")
            return
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 4))
        
        # Accuracy
        if 'accuracy' in self.history.history:
            axes[0].plot(self.history.history['accuracy'], label='Train Accuracy')
        if 'val_accuracy' in self.history.history:
            axes[0].plot(self.history.history['val_accuracy'], label='Val Accuracy')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Accuracy')
        axes[0].set_title('Model Accuracy')
        axes[0].legend()
        axes[0].grid(True)
        
        # Loss
        if 'loss' in self.history.history:
            axes[1].plot(self.history.history['loss'], label='Train Loss')
        if 'val_loss' in self.history.history:
            axes[1].plot(self.history.history['val_loss'], label='Val Loss')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Loss')
        axes[1].set_title('Model Loss')
        axes[1].legend()
        axes[1].grid(True)
        
        plt.tight_layout()
        plt.savefig(str(self.results_dir / 'cnn_training_history.png'), dpi=100, bbox_inches='tight')
        print(f"✓ Training history saved to {self.results_dir / 'cnn_training_history.png'}")
        plt.close()
    
    def save_model(self, filename='model1/mastitis_image_model.keras'):
        """Save trained model."""
        path = self.model_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        self.model.save(str(path))
        print(f"✓ Model saved to {path}")
        return path
    
    def save_metrics(self, filename='cnn_metrics.json'):
        """Save metrics to JSON."""
        # Prepare metrics
        metrics = {
            'test_accuracy': self.test_metrics.get('test_accuracy'),
            'test_loss': self.test_metrics.get('test_loss'),
            'final_train_accuracy': float(self.history.history['accuracy'][-1]) if self.history else None,
            'final_val_accuracy': float(self.history.history['val_accuracy'][-1]) if self.history else None,
            'epochs_trained': len(self.history.history['loss']) if self.history else 0
        }
        
        path = self.results_dir / filename
        with open(path, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"✓ Metrics saved to {path}")
        return path
    
    def train_full_pipeline(self, X_train, y_train, X_val, y_val, X_test, y_test,
                           epochs=30, batch_size=16, freeze_base=True):
        """Complete training pipeline."""
        print("\n" + "="*70)
        print("CNN IMAGE MODEL TRAINING")
        print("="*70)
        
        # Build model
        print("\n[1/4] Building model...")
        self.build_model(input_shape=(224, 224, 3))
        print(f"✓ Model built with {self.model.count_params():,} parameters")

        # Balance training classes before fitting
        print("\n[1.5/4] Balancing training data...")
        X_train_balanced, y_train_balanced, class_weight = self._balance_training_data(X_train, y_train)
        
        # Train
        print("\n[2/4] Training model...")
        self.train(
            X_train_balanced,
            y_train_balanced,
            X_val,
            y_val,
            epochs=epochs,
            batch_size=batch_size,
            class_weight=class_weight,
        )
        
        # Evaluate
        print("\n[3/4] Evaluating on test set...")
        self.evaluate(X_test, y_test)
        
        # Save & Plot
        print("\n[4/4] Saving model and metrics...")
        self.plot_training_history()
        self.save_model()
        self.save_metrics()
        
        return self.model, self.test_metrics


if __name__ == '__main__':
    from preprocessing.image_preprocessing import DatasetBuilder
    
    # Load data
    builder = DatasetBuilder()
    X, y, paths, df = builder.load_dataset()
    X_train, X_val, X_test, y_train, y_val, y_test = builder.split_data(X, y)
    
    # Train
    trainer = ImageModelTrainer()
    trainer.train_full_pipeline(
        X_train, y_train, X_val, y_val, X_test, y_test,
        epochs=30, batch_size=16
    )
