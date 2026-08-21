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
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import warnings
warnings.filterwarnings('ignore')

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def letterbox_resize(image, target_size=(224, 224), padding_color=(128, 128, 128)):
    """
    Aspect-ratio-preserving resize + letterbox padding.
    Accepts PIL Image or numpy ndarray (RGB), returns uint8 RGB numpy array of target_size.
    """
    if isinstance(image, np.ndarray):
        pil_img = Image.fromarray(image.astype(np.uint8))
    elif isinstance(image, Image.Image):
        pil_img = image.convert("RGB")
    else:
        raise TypeError(f"Unsupported image type: {type(image)}")

    orig_w, orig_h = pil_img.size
    target_w, target_h = target_size
    scale = min(target_w / orig_w, target_h / orig_h)
    new_w, new_h = max(1, int(orig_w * scale)), max(1, int(orig_h * scale))
    img_resized = pil_img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGB", target_size, tuple(padding_color))
    paste_x = (target_w - new_w) // 2
    paste_y = (target_h - new_h) // 2
    canvas.paste(img_resized, (paste_x, paste_y))

    return np.array(canvas, dtype=np.uint8)


def preprocess_image_for_model1(image, target_size=(224, 224)):
    """
    Complete Model 1 preprocessing pipeline according to preprocessing_config.json:
    1. Aspect-ratio-preserving letterbox resize to target_size with (128, 128, 128) padding.
    2. MobileNetV2 normalization to [-1, 1].

    Returns:
        preprocessed_array: float32 ndarray (target_size[0], target_size[1], 3) in range [-1, 1]
        canvas_rgb: uint8 ndarray (target_size[0], target_size[1], 3)
    """
    canvas_rgb = letterbox_resize(image, target_size=target_size, padding_color=(128, 128, 128))
    img_float = canvas_rgb.astype(np.float32)
    preprocessed_array = preprocess_input(img_float)
    return preprocessed_array, canvas_rgb


class DatasetBuilder:
    """Load and preprocess mastitis image dataset for Model 1 (MobileNetV2)."""

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
        """Load and preprocess a single image with letterbox resize + MobileNetV2 normalization."""
        try:
            pil_img = Image.open(str(img_path)).convert("RGB")
            preprocessed, _ = preprocess_image_for_model1(pil_img, target_size=self.image_size)
            return preprocessed
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
