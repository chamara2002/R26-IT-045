"""
Unit tests for Grad-CAM explainability generation and visual overlay.
"""
import sys
from pathlib import Path
import pytest
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from inference.hybrid_fusion import HybridFusionModel
from utils.gradcam_explainer import GradCAMExplainer


@pytest.fixture(scope="module")
def loaded_explainer():
    """Fixture providing initialized GradCAMExplainer with active Model 1."""
    fusion = HybridFusionModel()
    assert fusion.is_image_model_ready, "Model 1 failed to load for Grad-CAM tests"
    explainer = GradCAMExplainer(fusion.cnn_model)
    return explainer


def test_gradcam_heatmap_generation(loaded_explainer):
    """Verify that Grad-CAM produces a 2D normalized heatmap."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    heatmap = loaded_explainer.generate_gradcam(dummy_img, class_idx=1)

    assert heatmap is not None
    assert len(heatmap.shape) == 2
    assert heatmap.min() >= 0.0
    assert heatmap.max() <= 1.0


def test_gradcam_overlay_rendering(loaded_explainer):
    """Verify that heatmap overlays cleanly onto a 224x224 RGB image."""
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    heatmap = loaded_explainer.generate_gradcam(dummy_img.astype(np.float32), class_idx=1)
    overlay = loaded_explainer.overlay_gradcam(dummy_img, heatmap)

    assert overlay is not None
    assert overlay.shape == (224, 224, 3)
    assert overlay.dtype == np.uint8


def test_model1_standalone_gradcam_explainer():
    """Verify that models/model1/gradcam_explainer.py functions work properly."""
    from models.model1.gradcam_explainer import predict_mastitis, generate_gradcam
    dummy_img = np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)

    res = predict_mastitis(dummy_img)
    assert "prediction" in res
    assert "probability" in res
    assert 0.0 <= res["probability"] <= 1.0
    assert res["prediction"] in ("mastitis", "normal")

    heatmap, overlay, prob = generate_gradcam(dummy_img)
    assert heatmap.shape == (224, 224)
    assert overlay.shape == (224, 224, 3)
    assert 0.0 <= prob <= 1.0
