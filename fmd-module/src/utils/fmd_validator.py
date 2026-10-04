"""
Cattle Mouth & Hoof Anatomical Relevance Validator for CattleSense FMD Module.

Performs multi-layer verification to detect whether an uploaded photo is a genuine
cattle mouth/tongue or hoof photograph versus an out-of-distribution (OOD) invalid image
(e.g., human face, car, room, landscape, random object, udder, document, blank, or pasture).
"""

from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import cv2
import numpy as np
from PIL import Image

try:
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import GlobalAveragePooling2D
except ImportError:
    Model = None
    GlobalAveragePooling2D = None


class FMDAnatomicalValidator:
    """Multi-layer anatomical and computer vision validator for cattle mouth/hoof photographs."""

    def __init__(self, cnn_model: Optional[Any] = None, centroid_path: Optional[Path] = None, similarity_threshold: float = 0.05):
        self.cnn_model = cnn_model
        self.feature_extractor = None
        self.similarity_threshold = float(similarity_threshold)
        self.centroid = None

        if centroid_path is not None:
            self.centroid_path = Path(centroid_path)
        else:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.centroid_path = base_dir / "models" / "model" / "fmd_reference_centroid.npy"

        self._load_centroid()
        if cnn_model is not None:
            self.init_feature_extractor(cnn_model)

    def _load_centroid(self) -> None:
        if self.centroid_path.exists():
            try:
                self.centroid = np.load(str(self.centroid_path))
                norm = np.linalg.norm(self.centroid)
                if norm > 1e-7:
                    self.centroid = self.centroid / norm
            except Exception as exc:
                print(f"⚠ Could not load FMD reference centroid: {exc}")

    def init_feature_extractor(self, cnn_model: Any) -> None:
        self.cnn_model = cnn_model
        if cnn_model is not None and Model is not None:
            try:
                target_layer = None
                for layer in cnn_model.layers:
                    if "global_average_pooling" in layer.name.lower() or (GlobalAveragePooling2D and isinstance(layer, GlobalAveragePooling2D)):
                        target_layer = layer
                        break
                if target_layer is not None:
                    self.feature_extractor = Model(
                        inputs=cnn_model.inputs,
                        outputs=target_layer.output,
                    )
            except Exception as exc:
                print(f"⚠ Could not initialize feature extractor for FMD validation: {exc}")

    def validate(self, image_input: Any) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validate whether the given image depicts a cattle mouth, tongue, muzzle, or hooves.

        Returns:
            is_valid (bool): True if photo shows bovine mouth/hoof, False otherwise.
            message (str): Explanatory reason/message for user feedback.
            details (dict): Quantitative metrics and signals.
        """
        # 1. Normalize image representation to RGB NumPy array
        if isinstance(image_input, Image.Image):
            img_rgb = np.array(image_input.convert("RGB"), dtype=np.uint8)
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            if len(image_input.shape) == 3 and image_input.shape[2] == 3:
                img_rgb = image_input.astype(np.uint8)
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            else:
                return (
                    False,
                    "Invalid image format. Please upload a standard color JPEG or PNG photograph of the cow's mouth or hooves.",
                    {"error": "invalid_shape"},
                )
        else:
            return (
                False,
                "Unsupported image input. Please upload a valid photograph of the cow's mouth or hooves.",
                {"error": "unsupported_type"},
            )

        h, w = img_rgb.shape[:2]
        if h < 64 or w < 64:
            return (
                False,
                "Image resolution is too low for diagnostic evaluation. Please upload a higher resolution photo.",
                {"height": h, "width": w},
            )

        # 2. Blank / Monochrome / Contrast Check
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        var = float(np.var(gray))
        if var < 25.0:
            return (
                False,
                "This photo appears blank, solid, or heavily blurred without visible cattle mouth or hoof tissue. Please upload a clear photo.",
                {"variance": round(var, 2)},
            )

        # 3. Environmental & Color Space Check
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]

        # Bovine oral mucosa / tongue / hoof coronary tissue chrominance profile
        tissue_mask = (cr >= 115) & (cr <= 210) & (cb >= 55) & (cb <= 155)
        dark_hoof_mask = (gray < 85) & (hsv[:, :, 1] < 140)
        tissue_ratio = float(np.mean(tissue_mask | dark_hoof_mask))

        # Green pasture / heavy vegetation mask
        green_mask = (hsv[:, :, 0] >= 35) & (hsv[:, :, 0] <= 85) & (hsv[:, :, 1] >= 40)
        green_ratio = float(np.mean(green_mask))

        # Blue sky / water / solid blue background
        blue_mask = (hsv[:, :, 0] >= 90) & (hsv[:, :, 0] <= 135) & (hsv[:, :, 1] >= 40)
        blue_ratio = float(np.mean(blue_mask))

        if green_ratio > 0.45:
            return (
                False,
                "This photo shows pasture vegetation rather than a close-up cattle mouth or hoof. Please upload a close-up photo of the mouth, tongue, or hooves.",
                {"green_ratio": round(green_ratio, 3), "tissue_ratio": round(tissue_ratio, 3)},
            )

        if blue_ratio > 0.45:
            return (
                False,
                "This photo shows background scenery rather than cattle mouth or hoof tissue. Please upload a close-up photo of the mouth or hooves.",
                {"blue_ratio": round(blue_ratio, 3), "tissue_ratio": round(tissue_ratio, 3)},
            )

        if tissue_ratio < 0.12:
            return (
                False,
                "This photo does not show cattle mouth, tongue, or hoof tissue. Please upload a clear photo of the cow's mouth or hooves.",
                {"tissue_ratio": round(tissue_ratio, 3)},
            )

        # 4. Deep Feature Embedding Cosine Similarity Check (against mouth/hoof reference centroid)
        sim = None
        if self.feature_extractor is not None and self.centroid is not None:
            try:
                resized = cv2.resize(img_rgb, (160, 160), interpolation=cv2.INTER_AREA).astype("float32") / 255.0
                feat = self.feature_extractor.predict(np.expand_dims(resized, axis=0), verbose=0)[0]
                norm = np.linalg.norm(feat)
                if norm > 1e-7:
                    feat_norm = feat / norm
                    sim = float(np.dot(feat_norm, self.centroid))
            except Exception as exc:
                print(f"⚠ FMD feature similarity check exception: {exc}")

        details = {
            "embedding_similarity": round(sim, 4) if sim is not None else None,
            "tissue_ratio": round(tissue_ratio, 3),
            "green_ratio": round(green_ratio, 3),
            "blue_ratio": round(blue_ratio, 3),
            "variance": round(var, 1),
        }

        if sim is not None and sim < self.similarity_threshold:
            return (
                False,
                "This photo does not appear to show cattle mouth, tongue, or hoof lesions. Please upload a close-up photo of the cow's mouth or hooves.",
                details,
            )

        return True, "Valid cattle mouth/hoof photograph", details
