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


def test_compute_attention_reliability_center_focused():
    """Verify that a center-focused heatmap receives high reliability."""
    from utils.gradcam_explainer import compute_attention_reliability

    # Synthetic heatmap with peak in the center (row 112, col 112)
    heat = np.zeros((224, 224), dtype=np.float32)
    heat[90:135, 90:135] = 1.0

    rel = compute_attention_reliability(heat)
    assert rel["reliability"] == "high"
    assert rel["peak_on_center"] is True
    assert rel["center_attention_pct"] >= 65.0
    assert rel["reliability_note"] is None


def test_compute_attention_reliability_edge_focused():
    """Verify that an edge/corner-focused heatmap receives low reliability."""
    from utils.gradcam_explainer import compute_attention_reliability

    # Synthetic heatmap with peak in the top-left corner
    heat = np.zeros((224, 224), dtype=np.float32)
    heat[0:30, 0:30] = 1.0

    rel = compute_attention_reliability(heat)
    assert rel["reliability"] == "low"
    assert rel["peak_on_center"] is False
    assert rel["center_attention_pct"] < 40.0
    assert rel["reliability_note"] is not None


def test_compute_attention_reliability_zero_map():
    """Verify that an empty zero heatmap receives low reliability."""
    from utils.gradcam_explainer import compute_attention_reliability

    heat = np.zeros((224, 224), dtype=np.float32)
    rel = compute_attention_reliability(heat)
    assert rel["reliability"] == "low"
    assert rel["center_attention_pct"] == 0.0
    assert rel["peak_on_center"] is False


def test_gradcam_metadata_contract(loaded_explainer):
    """Verify that generate_gradcam with return_metadata=True produces all required fields."""
    dummy_img = np.random.rand(224, 224, 3).astype(np.float32)
    heatmap, meta = loaded_explainer.generate_gradcam(dummy_img, class_idx=1, return_metadata=True)

    assert isinstance(meta, dict)
    assert "gradcam_reliability" in meta
    assert meta["gradcam_reliability"] in ("high", "moderate", "low")
    assert "center_attention_pct" in meta
    assert isinstance(meta["center_attention_pct"], (float, int))
    assert "peak_on_center" in meta
    assert isinstance(meta["peak_on_center"], bool)
    assert "low_signal" in meta
    assert "grad_norm" in meta

