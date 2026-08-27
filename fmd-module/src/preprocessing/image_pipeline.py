import base64
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}


def _is_image_file(path: Path) -> bool:
    return path.suffix.lower() in SUPPORTED_EXTENSIONS


def decode_base64_image(image_data: str) -> np.ndarray:
    """Decode a base64 image string or data URL to an RGB NumPy array."""
    if image_data.startswith("data:"):
        _, encoded = image_data.split(",", 1)
    else:
        encoded = image_data

    image_bytes = base64.b64decode(encoded)
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode base64 image payload")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def detect_roi(image: np.ndarray) -> np.ndarray:
    """Detect a candidate region of interest in the image and crop it."""
    grayscale = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(grayscale, (7, 7), 0)
    edges = cv2.Canny(blurred, 30, 120)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return image

    biggest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(biggest)
    pad = int(0.1 * max(w, h))
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(image.shape[1], x + w + pad)
    y1 = min(image.shape[0], y + h + pad)
    roi = image[y0:y1, x0:x1]
    return roi if roi.size > 0 else image


def preprocess_image(image: np.ndarray, target_size: Tuple[int, int] = (160, 160)) -> np.ndarray:
    """Normalize and resize an RGB image tensor for CNN input."""
    resized = cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
    processed = resized.astype("float32") / 255.0
    return processed


def load_image_path(path: Path, target_size: Tuple[int, int] = (160, 160)) -> np.ndarray:
    """Load an image file path and preprocess it."""
    if not path.exists() or not _is_image_file(path):
        raise FileNotFoundError(f"Image file not found or unsupported: {path}")

    image = cv2.imread(str(path))
    if image is None:
        raise ValueError(f"Failed to load image: {path}")
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return preprocess_image(image, target_size)


def augment_image(image: np.ndarray) -> np.ndarray:
    """Apply simple augmentation transforms to increase model robustness."""
    augmented = image.copy()
    if np.random.rand() < 0.5:
        augmented = np.fliplr(augmented)
    if np.random.rand() < 0.5:
        angle = np.random.uniform(-20, 20)
        matrix = cv2.getRotationMatrix2D((augmented.shape[1] / 2, augmented.shape[0] / 2), angle, 1.0)
        augmented = cv2.warpAffine(augmented, matrix, (augmented.shape[1], augmented.shape[0]), borderMode=cv2.BORDER_REFLECT)
    if np.random.rand() < 0.4:
        scale = np.random.uniform(0.9, 1.1)
        matrix = cv2.getRotationMatrix2D((augmented.shape[1] / 2, augmented.shape[0] / 2), 0, scale)
        augmented = cv2.warpAffine(augmented, matrix, (augmented.shape[1], augmented.shape[0]), borderMode=cv2.BORDER_REFLECT)
    if np.random.rand() < 0.4:
        value = np.random.uniform(-0.12, 0.12)
        augmented = np.clip(augmented + value, 0.0, 1.0)
    if np.random.rand() < 0.4:
        shift_x = int(augmented.shape[1] * np.random.uniform(-0.05, 0.05))
        shift_y = int(augmented.shape[0] * np.random.uniform(-0.05, 0.05))
        matrix = np.float32([[1, 0, shift_x], [0, 1, shift_y]])
        augmented = cv2.warpAffine(augmented, matrix, (augmented.shape[1], augmented.shape[0]), borderMode=cv2.BORDER_REFLECT)
    return augmented
