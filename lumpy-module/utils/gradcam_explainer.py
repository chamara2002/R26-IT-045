"""
Grad-CAM explainability for the PyTorch ResNet-50 LSD classifier.

Highlights which region of the uploaded skin image drove the prediction,
using gradients from the last convolutional block (layer4) - the standard
Grad-CAM target for a torchvision ResNet-50.
"""
import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAMExplainer:
    """Generate Grad-CAM heatmaps for the ResNet-50 LSD classifier."""

    def __init__(self, model, target_layer=None):
        self.model = model
        self.target_layer = target_layer or model.layer4
        self._activations = None
        self._gradients = None

        self.target_layer.register_forward_hook(self._save_activations)
        self.target_layer.register_full_backward_hook(self._save_gradients)

    def _save_activations(self, module, input, output):
        self._activations = output.detach()

    def _save_gradients(self, module, grad_input, grad_output):
        self._gradients = grad_output[0].detach()

    def generate_gradcam(self, input_tensor, class_idx=1):
        """input_tensor: preprocessed (1, 3, 224, 224) tensor. Returns a (H, W) heatmap in [0, 1]."""
        self.model.zero_grad()
        output = self.model(input_tensor)
        score = output[0, class_idx]
        score.backward()

        gradients = self._gradients[0]        # (C, H, W)
        activations = self._activations[0]     # (C, H, W)

        weights = gradients.mean(dim=(1, 2))   # (C,)
        cam = torch.zeros(activations.shape[1:], dtype=torch.float32, device=activations.device)
        for c, w in enumerate(weights):
            cam += w * activations[c]

        cam = F.relu(cam)
        cam = cam - cam.min()
        cam_max = cam.max()
        if cam_max > 0:
            cam = cam / cam_max

        return cam.cpu().numpy()

    def overlay_gradcam(self, original_rgb_image, heatmap, alpha=0.4, colormap=cv2.COLORMAP_JET):
        """original_rgb_image: HxWx3 uint8 RGB array. Returns a BGR uint8 overlay ready for cv2.imwrite."""
        h, w = original_rgb_image.shape[:2]
        heatmap_resized = cv2.resize(heatmap.astype(np.float32), (w, h))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, colormap)

        img_bgr = cv2.cvtColor(original_rgb_image.astype(np.uint8), cv2.COLOR_RGB2BGR)
        overlay = cv2.addWeighted(img_bgr, 1 - alpha, heatmap_colored, alpha, 0)
        return overlay
