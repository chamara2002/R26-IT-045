"""
Image preprocessing and dataset loading for mastitis detection.
Handles image resizing, normalization, and train/val/test splitting.
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
import cv2
from sklearn.model_selection import train_test_split
from tensorflow.keras.applications.resnet import preprocess_input
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class DatasetBuilder:
    """Load and preprocess mastitis image dataset."""
    
    def __init__(self, dataset_path='dataset/train', image_size=(224, 224)):
        self.dataset_path = Path(dataset_path)
        self.image_size = image_size
        self.df = None
        
    def load_dataset(self):
        """Load images and labels from dataset directory."""
        X_images = []
        y_labels = []
        img_paths = []
        
        # Load mastitis images
        mastitis_dir = self.dataset_path / 'mastitis'
        if mastitis_dir.exists():
            for img_file in sorted(mastitis_dir.glob('*.jpg')) + sorted(mastitis_dir.glob('*.png')):
                img = self._load_and_preprocess_image(img_file)
                if img is not None:
                    X_images.append(img)
                    y_labels.append(1)  # mastitis = 1
                    img_paths.append(str(img_file))
        
        # Load normal images
        normal_dir = self.dataset_path / 'normal'
        if normal_dir.exists():
            for img_file in sorted(normal_dir.glob('*.jpg')) + sorted(normal_dir.glob('*.png')):
                img = self._load_and_preprocess_image(img_file)
                if img is not None:
                    X_images.append(img)
                    y_labels.append(0)  # normal = 0
                    img_paths.append(str(img_file))
        
        X_images = np.array(X_images, dtype=np.float32)
        y_labels = np.array(y_labels, dtype=np.int32)
        
        # Create DataFrame
        self.df = pd.DataFrame({
            'image_path': img_paths,
            'label': y_labels,
            'label_name': ['normal' if label == 0 else 'mastitis' for label in y_labels]
        })
        
        print(f"Loaded {len(X_images)} images from {self.dataset_path}")
        print(f"  Mastitis: {np.sum(y_labels == 1)}")
        print(f"  Normal:   {np.sum(y_labels == 0)}")
        
        return X_images, y_labels, img_paths, self.df
    
    def _load_and_preprocess_image(self, img_path):
        """Load and preprocess a single image."""
        try:
            # Read image
            img = cv2.imread(str(img_path))
            if img is None:
                return None
            
            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize to target size
            img = cv2.resize(img, self.image_size)
            
            # Prepare for the pretrained ResNet50 backbone
            img = preprocess_input(img.astype(np.float32))
            
            return img
        except Exception as e:
            print(f"Error loading {img_path}: {e}")
            return None
    
    def split_data(self, X, y, train_ratio=0.6, val_ratio=0.15):
        """Split data into train, validation, and test sets."""
        # Train/Test split (0.75/0.25 of total, which is 60%/25% when 60% is set as train_ratio)
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )
        
        # Train/Val split (0.8/0.2 of temp)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=0.25, random_state=42, stratify=y_temp
        )
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def augment_image(self, img):
        """Apply simple augmentation (random rotation, flip, brightness)."""
        # Random horizontal flip
        if np.random.random() > 0.5:
            img = np.fliplr(img)
        
        # Random rotation
        angle = np.random.randint(-15, 15)
        h, w = img.shape[:2]
        M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
        img = cv2.warpAffine(img, M, (w, h))
        
        # Random brightness
        brightness = np.random.uniform(0.8, 1.2)
        img = np.clip(img * brightness, 0, 1)
        
        return img


# Alias for compatibility
ImageDatasetBuilder = DatasetBuilder


if __name__ == '__main__':
    builder = DatasetBuilder()
    X, y, paths, df = builder.load_dataset()
    X_train, X_val, X_test, y_train, y_val, y_test = builder.split_data(X, y)
    
    print(f"\nDataset split:")
    print(f"  Train: {len(X_train)} samples")
    print(f"  Val:   {len(X_val)} samples")
    print(f"  Test:  {len(X_test)} samples")
