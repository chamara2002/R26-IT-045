"""
Grad-CAM Explainability for CNN predictions.
Visualizes which parts of the image contribute to mastitis prediction.
"""
import sys
from pathlib import Path
import numpy as np
import cv2
import matplotlib.pyplot as plt
from tensorflow import keras
import tensorflow as tf

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def compute_attention_reliability(heatmap):
    """
    Evaluate the spatial reliability of a Grad-CAM heatmap for udder images.
    
    Determines whether model attention concentrates on the central anatomical udder
    region versus the peripheral background, ground, stall edges, or camera border artifacts.
    
    Args:
        heatmap: 2D numpy array (e.g. 224x224, 7x7, or any 2D resolution) with values in [0, 1].
        
    Returns:
        dict containing:
            - center_attention_pct (float): percentage of top-20% activation pixels inside center region.
            - peak_on_center (bool): whether the maximum activation hotspot is inside the center region.
            - reliability (str): "high", "moderate", or "low".
            - reliability_note (str | None): advisory note when reliability is moderate or low (None for high).
    """
    if heatmap is None or not isinstance(heatmap, np.ndarray) or heatmap.ndim != 2:
        return {
            "center_attention_pct": 0.0,
            "peak_on_center": False,
            "reliability": "low",
            "reliability_note": "Invalid or missing heatmap data for reliability assessment."
        }

    h, w = heatmap.shape
    max_val = float(np.max(heatmap))
    if max_val <= 1e-6:
        return {
            "center_attention_pct": 0.0,
            "peak_on_center": False,
            "reliability": "low",
            "reliability_note": "Model attention was diffuse for this image; no localized activation pattern detected."
        }

    # Generate central anatomical region mask (elliptical mask covering the central ~60% area)
    mask_center = np.zeros((h, w), dtype=np.uint8)
    cv2.ellipse(
        mask_center,
        (int(w * 0.50), int(h * 0.49)),
        (int(w * 0.39), int(h * 0.36)),
        0, 0, 360, 1, -1
    )
    is_center = (mask_center > 0)

    # Top 20% highest-activation pixels (with minimum intensity cutoff to prevent 0-value flooding)
    p80 = float(np.percentile(heatmap, 80))
    cutoff = max(p80, max_val * 0.30)
    top_mask = heatmap >= cutoff
    total_top = int(np.sum(top_mask))

    if total_top == 0:
        top_mask = heatmap >= (max_val * 0.10)
        total_top = int(np.sum(top_mask))

    top_on_center = int(np.sum(top_mask & is_center))
    center_attention_pct = float((top_on_center / total_top) * 100.0) if total_top > 0 else 0.0

    peak_y, peak_x = np.unravel_index(np.argmax(heatmap), heatmap.shape)
    peak_on_center = bool(is_center[peak_y, peak_x])

    # Threshold guidelines:
    # - High: center_attention_pct >= 65% AND peak_on_center is True
    # - Moderate: center_attention_pct >= 40% (or center_attention_pct >= 65% with peak on border)
    # - Low: center_attention_pct < 40% (majority of focus on perimeter background / ground)
    if center_attention_pct >= 65.0 and peak_on_center:
        reliability = "high"
        reliability_note = None
    elif center_attention_pct >= 40.0:
        reliability = "moderate"
        reliability_note = "Model attention was partially diffuse outside the udder region for this image; treat this heatmap as supporting evidence only."
    else:
        reliability = "low"
        reliability_note = "Model attention concentrated primarily on background/peripheral cues rather than the udder; heatmap localization is low reliability."

    return {
        "center_attention_pct": round(center_attention_pct, 1),
        "peak_on_center": peak_on_center,
        "reliability": reliability,
        "reliability_note": reliability_note
    }


class GradCAMExplainer:
    """Generate Grad-CAM visualizations for model predictions using pre-activation logits."""

    def __init__(self, model, layer_name=None):
        self.model = model
        self.conv_layer_name = layer_name or "conv5_block3_out"

        if not hasattr(model, 'layers') or not model.layers:
            raise ValueError("Model has no layers for Grad-CAM generation")

        # Find target layer in model
        target_layer = None
        try:
            target_layer = self.model.get_layer(self.conv_layer_name)
        except Exception:
            # Fallback: search for conv5_block3_out or last conv/activation layer
            for layer in reversed(self.model.layers):
                if 'conv5_block3_out' in layer.name or 'conv5' in layer.name or 'relu' in layer.name or 'conv' in layer.name:
                    target_layer = layer
                    self.conv_layer_name = layer.name
                    break
            if target_layer is None:
                target_layer = self.model.layers[-1]
                self.conv_layer_name = target_layer.name

        self.last_layer = self.model.layers[-1]
        self.compute_dense_logits = False

        # Determine pre-activation logit representation to avoid sigmoid/softmax saturation
        if isinstance(self.last_layer, tf.keras.layers.Dense) and getattr(self.last_layer, 'activation', None) not in (None, tf.keras.activations.linear):
            # Last layer is Dense with non-linear activation (e.g. sigmoid or softmax)
            # Tap into last layer's input to compute linear logits directly, avoiding saturation
            self.grad_model = tf.keras.models.Model(
                inputs=self.model.inputs,
                outputs=[target_layer.output, self.last_layer.input]
            )
            self.compute_dense_logits = True
        elif isinstance(self.last_layer, tf.keras.layers.Activation):
            self.grad_model = tf.keras.models.Model(
                inputs=self.model.inputs,
                outputs=[target_layer.output, self.last_layer.input]
            )
        else:
            self.grad_model = tf.keras.models.Model(
                inputs=self.model.inputs,
                outputs=[target_layer.output, self.model.output]
            )

    def generate_gradcam(self, image_array, class_idx=1, eps=1e-8, energy_threshold=1e-5, return_metadata=False):
        """
        Generate Grad-CAM heatmap normalized to [0, 1] using pre-sigmoid logits.
        
        Args:
            image_array: input image (H, W, 3) or (1, H, W, 3)
            class_idx: target class index (default 1 for mastitis)
            eps: numerical stability epsilon for normalization
            energy_threshold: minimum raw heatmap activation below which signal is considered low/diffuse
            return_metadata: if True, returns (heatmap, metadata_dict), else returns heatmap
            
        Returns:
            heatmap: (224, 224) float32 in [0, 1]
            (optional) metadata: dict with {'low_signal': bool, 'grad_norm': float, 'raw_max': float, 'raw_min': float,
                                            'gradcam_reliability': str, 'center_attention_pct': float,
                                            'peak_on_center': bool, 'reliability_note': str|None}
        """
        image_array = np.asarray(image_array, dtype=np.float32)
        if len(image_array.shape) == 3:
            image_tensor = tf.cast(np.expand_dims(image_array, axis=0), tf.float32)
        else:
            image_tensor = tf.cast(image_array, tf.float32)

        metadata = {
            "low_signal": False,
            "grad_norm": 0.0,
            "raw_max": 0.0,
            "raw_min": 0.0,
            "gradcam_reliability": "high",
            "center_attention_pct": 100.0,
            "peak_on_center": True,
            "reliability_note": None,
        }

        try:
            with tf.GradientTape() as tape:
                conv_output, top_output = self.grad_model(image_tensor)
                tape.watch(conv_output)

                if self.compute_dense_logits:
                    logits = tf.matmul(top_output, self.last_layer.kernel)
                    if getattr(self.last_layer, 'use_bias', True):
                        logits = logits + self.last_layer.bias
                else:
                    logits = top_output

                # Pre-activation logit output
                if len(logits.shape) == 2 and logits.shape[1] == 1:
                    # Binary sigmoid output: class_idx 0 (normal) -> -logit, class_idx 1 (mastitis) -> +logit
                    if class_idx == 0:
                        loss = -logits[:, 0]
                    else:
                        loss = logits[:, 0]
                elif len(logits.shape) == 2 and logits.shape[1] > 1:
                    loss = logits[:, class_idx]
                else:
                    loss = tf.reduce_max(logits)

            grads = tape.gradient(loss, conv_output)
            if grads is None:
                metadata["low_signal"] = True
                metadata["gradcam_reliability"] = "low"
                metadata["center_attention_pct"] = 0.0
                metadata["peak_on_center"] = False
                metadata["reliability_note"] = "Model gradients were unavailable for this prediction."
                zero_map = np.zeros((224, 224), dtype=np.float32)
                return (zero_map, metadata) if return_metadata else zero_map

            grads_np = grads.numpy()
            grad_norm = float(np.linalg.norm(grads_np))
            metadata["grad_norm"] = grad_norm

            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            conv_output_0 = conv_output[0]
            raw_heatmap = conv_output_0 @ pooled_grads[..., tf.newaxis]
            raw_heatmap = tf.squeeze(raw_heatmap)
            raw_np = raw_heatmap.numpy()
            metadata["raw_min"] = float(raw_np.min())
            metadata["raw_max"] = float(raw_np.max())

            # Apply ReLU to retain only positive contributions to mastitis class
            relu_heatmap = np.maximum(raw_np, 0.0)
            relu_max = float(relu_heatmap.max())

            if relu_max <= energy_threshold or grad_norm < 1e-6:
                # Weak or negative signal across the entire receptive field (e.g. confident normal)
                metadata["low_signal"] = True
                metadata["gradcam_reliability"] = "low"
                metadata["center_attention_pct"] = 0.0
                metadata["peak_on_center"] = False
                metadata["reliability_note"] = "Model attention was diffuse for this image; no localized activation pattern detected."
                heatmap_resized = np.zeros((224, 224), dtype=np.float32)
            else:
                norm_heatmap = relu_heatmap / (relu_max + eps)
                heatmap_resized = tf.image.resize(
                    norm_heatmap[..., np.newaxis], (224, 224)
                ).numpy().squeeze()
                h_max = heatmap_resized.max()
                if h_max > 0:
                    heatmap_resized = heatmap_resized / (h_max + eps)
                heatmap_resized = np.clip(heatmap_resized, 0.0, 1.0).astype(np.float32)

                # Compute spatial attention reliability
                rel_info = compute_attention_reliability(heatmap_resized)
                metadata["gradcam_reliability"] = rel_info["reliability"]
                metadata["center_attention_pct"] = rel_info["center_attention_pct"]
                metadata["peak_on_center"] = rel_info["peak_on_center"]
                metadata["reliability_note"] = rel_info["reliability_note"]

            return (heatmap_resized, metadata) if return_metadata else heatmap_resized

        except Exception as e:
            print(f"[GradCAM] Generation exception: {e}")
            metadata["low_signal"] = True
            metadata["gradcam_reliability"] = "low"
            metadata["center_attention_pct"] = 0.0
            metadata["peak_on_center"] = False
            metadata["reliability_note"] = f"Grad-CAM generation error: {e}"
            zero_map = np.zeros((224, 224), dtype=np.float32)
            return (zero_map, metadata) if return_metadata else zero_map

    def compute_attention_reliability(self, heatmap):
        """Wrapper method for compute_attention_reliability."""
        return compute_attention_reliability(heatmap)
    
    def overlay_gradcam(self, image_array, heatmap, alpha=0.4, colormap=cv2.COLORMAP_JET):
        """
        Overlay Grad-CAM heatmap on original image.
        
        Args:
            image_array: RGB image array (H, W, 3), float [0, 1] or uint8 [0, 255].
            heatmap: 2D float array (H, W) normalized to [0.0, 1.0].
            alpha: Heatmap blend weight (0.0 to 1.0).
            colormap: OpenCV colormap (default cv2.COLORMAP_JET).
            
        Returns:
            RGB uint8 array (224, 224, 3) representing the blended overlay.
        """
        # Handle tensor inputs
        if isinstance(image_array, tf.Tensor):
            image_array = image_array.numpy()
        
        img = image_array.copy()
        
        # Ensure image is in uint8 [0, 255] RGB
        if img.dtype != np.uint8:
            if img.max() <= 1.0:
                img = (img * 255.0).astype(np.uint8)
            else:
                img = img.astype(np.uint8)
        
        if img.shape[:2] != (224, 224):
            img = cv2.resize(img, (224, 224))
            
        # Resize heatmap to 224x224
        heatmap_resized = cv2.resize(heatmap.astype(np.float32), (224, 224))
        heatmap_normalized = (np.clip(heatmap_resized, 0.0, 1.0) * 255.0).astype(np.uint8)
        
        # cv2.applyColorMap produces BGR
        heatmap_bgr = cv2.applyColorMap(heatmap_normalized, colormap)
        # Convert heatmap to RGB so we operate consistently in RGB color space
        heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)
        
        # Blend in RGB space
        overlay_rgb = cv2.addWeighted(img, 1.0 - alpha, heatmap_rgb, alpha, 0)
        
        return overlay_rgb
    
    def visualize_explanation(self, image_array, output_path=None):
        """Visualize Grad-CAM explanation."""
        # Generate heatmap
        heatmap = self.generate_gradcam(image_array)
        
        # Create overlay (returns RGB)
        overlay = self.overlay_gradcam(image_array, heatmap)
        
        # Plot
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Original image (RGB)
        if image_array.max() <= 1.0:
            axes[0].imshow((image_array * 255.0).astype(np.uint8))
        else:
            axes[0].imshow(image_array.astype(np.uint8))
        axes[0].set_title('Original Image')
        axes[0].axis('off')
        
        # Heatmap
        axes[1].imshow(heatmap, cmap='jet')
        axes[1].set_title('Grad-CAM Heatmap')
        axes[1].axis('off')
        
        # Overlay (already in RGB)
        axes[2].imshow(overlay)
        axes[2].set_title('Grad-CAM Overlay')
        axes[2].axis('off')
        
        plt.tight_layout()
        
        if output_path:
            plt.savefig(output_path, dpi=100, bbox_inches='tight')
            print(f"✓ Saved visualization to {output_path}")
        
        return fig


if __name__ == '__main__':
    from tensorflow import keras
    
    # Load a pre-trained model
    model_path = 'models/model1/mastitis_image_model.keras'
    if Path(model_path).exists():
        model = keras.models.load_model(model_path)
        explainer = GradCAMExplainer(model)
        
        # Test with random image
        test_image = np.random.rand(224, 224, 3).astype(np.float32)
        explainer.visualize_explanation(test_image, 'results/gradcam_explanation.png')
    else:
        print(f"Model not found at {model_path}")

