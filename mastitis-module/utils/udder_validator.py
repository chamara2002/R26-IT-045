"""
Udder & Teat Anatomical Relevance Validator for CattleSense Mastitis Module.

Performs multi-layer verification to detect whether an uploaded photo is a genuine
cow udder / teat image versus an out-of-distribution (OOD) non-udder image
(e.g., cow face, horns, whole body pasture shot, logo, vehicle, room, or arbitrary object).
"""

import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

try:
    from tensorflow import keras
except ImportError:
    keras = None


class UdderValidator:
    """Multi-layer anatomical and computer vision validator for cow udder photographs."""

    def __init__(self, cnn_model=None, centroid_path=None, similarity_threshold=0.51):
        self.cnn_model = cnn_model
        self.feature_extractor = None
        self.similarity_threshold = float(similarity_threshold)
        self.centroid = None

        if centroid_path is not None:
            self.centroid_path = Path(centroid_path)
        else:
            base_dir = Path(__file__).resolve().parent.parent
            self.centroid_path = base_dir / "models" / "model1" / "udder_reference_centroid.npy"

        self._load_centroid()
        self._init_feature_extractor()

    def _load_centroid(self):
        if self.centroid_path.exists():
            try:
                self.centroid = np.load(str(self.centroid_path))
                # Normalize centroid
                norm = np.linalg.norm(self.centroid)
                if norm > 1e-7:
                    self.centroid = self.centroid / norm
            except Exception as exc:
                print(f"⚠ Could not load udder reference centroid: {exc}")

    def _init_feature_extractor(self):
        if self.cnn_model is not None and keras is not None:
            try:
                # Extract from global average pooling layer
                target_layer = None
                for layer in self.cnn_model.layers:
                    if "global_average_pooling" in layer.name.lower() or isinstance(layer, keras.layers.GlobalAveragePooling2D):
                        target_layer = layer
                        break
                if target_layer is not None:
                    self.feature_extractor = keras.Model(
                        inputs=self.cnn_model.inputs,
                        outputs=target_layer.output
                    )
            except Exception as exc:
                print(f"⚠ Could not initialize feature extractor for udder validation: {exc}")

    def validate(self, image_input):
        """
        Validate whether the given image depicts a cow udder or teats.

        Args:
            image_input: PIL Image, RGB ndarray, or BGR ndarray.

        Returns:
            is_valid (bool): True if photo shows cow udder/teats, False otherwise.
            message (str): Explanatory reason/message for user feedback.
            details (dict): Quantitative metrics and signals.
        """
        # 1. Normalize image representation
        if isinstance(image_input, Image.Image):
            img_rgb = np.array(image_input.convert("RGB"), dtype=np.uint8)
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            if len(image_input.shape) == 3 and image_input.shape[2] == 3:
                # Assume RGB
                img_rgb = image_input.astype(np.uint8)
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            else:
                return (
                    False,
                    "Invalid image format. Please upload a standard color JPEG or PNG photograph.",
                    {"error": "invalid_shape"},
                )
        else:
            return (
                False,
                "Unsupported image input type. Please upload a valid photograph.",
                {"error": "unsupported_type"},
            )

        h, w = img_rgb.shape[:2]
        if h < 64 or w < 64:
            return (
                False,
                "Image resolution is too low for clinical evaluation. Please upload a higher resolution photo.",
                {"height": h, "width": w},
            )

        # 2. Blank / Monochrome / Contrast Check
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        var = float(np.var(gray))
        if var < 25.0:
            return (
                False,
                "This photo appears blank, solid, or heavily blurred without visible bovine udder tissue.",
                {"variance": var},
            )

        # 3. Environmental & Color Space Check
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]

        # Bovine udder/teat tissue chrominance profile
        tissue_mask = (cr >= 125) & (cr <= 195) & (cb >= 65) & (cb <= 145)
        tissue_ratio = float(np.mean(tissue_mask))

        # Green pasture / vegetation
        green_mask = (hsv[:, :, 0] >= 35) & (hsv[:, :, 0] <= 85) & (hsv[:, :, 1] >= 40)
        green_ratio = float(np.mean(green_mask))

        # Blue sky / water / solid background
        blue_mask = (hsv[:, :, 0] >= 90) & (hsv[:, :, 0] <= 135) & (hsv[:, :, 1] >= 40)
        blue_ratio = float(np.mean(blue_mask))

        if green_ratio > 0.38:
            return (
                False,
                "This photo shows pasture vegetation rather than a close-up cow udder or teats. Please upload a clear photo of the cow's udder.",
                {"green_ratio": green_ratio, "tissue_ratio": tissue_ratio},
            )

        if blue_ratio > 0.40:
            return (
                False,
                "This photo shows background/sky rather than a cow udder or teats. Please upload a close-up photo of the cow's udder.",
                {"blue_ratio": blue_ratio, "tissue_ratio": tissue_ratio},
            )

        if tissue_ratio < 0.20:
            return (
                False,
                "This photo does not show a cow udder or teats. Please upload a clear photo of the cow's udder or teats for mastitis screening.",
                {"tissue_ratio": tissue_ratio},
            )

        # 4. Deep Feature Embedding Cosine Similarity Check (Model 1 representation)
        sim = None
        if self.feature_extractor is not None and self.centroid is not None:
            try:
                pil_224 = Image.fromarray(img_rgb).resize((224, 224), Image.BILINEAR)
                arr_224 = np.expand_dims(np.array(pil_224, dtype=np.float32), axis=0)
                feat = self.feature_extractor.predict(arr_224, verbose=0)[0]
                norm_feat = feat / (np.linalg.norm(feat) + 1e-7)
                sim = float(np.dot(norm_feat, self.centroid))
            except Exception as exc:
                print(f"⚠ Feature similarity check exception: {exc}")

        details = {
            "embedding_similarity": sim,
            "tissue_ratio": round(tissue_ratio, 3),
            "green_ratio": round(green_ratio, 3),
            "blue_ratio": round(blue_ratio, 3),
            "variance": round(var, 1),
        }

        if sim is not None and sim < self.similarity_threshold:
            return (
                False,
                "This photo does not show a cow udder or teats. Please upload a clear photo of the cow's udder or teats for mastitis screening.",
                details,
            )

        return True, "Valid udder photograph", details
