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

class GradCAMExplainer:
    """Generate Grad-CAM visualizations for model predictions."""

    def __init__(self, model, layer_name=None):
        self.model = model
        self.conv_layer_name = layer_name or "block_13_expand_relu"

        if not hasattr(model, 'layers') or not model.layers:
            raise ValueError("Model has no layers for Grad-CAM generation")

        self.backbone = None
        self.top_layers = []

        # Check for MobileNetV2 or nested backbone layer
        for i, layer in enumerate(model.layers):
            layer_name_lower = layer.name.lower()
            if 'mobilenet' in layer_name_lower or (isinstance(layer, tf.keras.Model) and i < len(model.layers) - 1):
                self.backbone = layer
                self.top_layers = [l for l in model.layers[i + 1:] if 'dropout' not in l.name.lower()]
                print(f"[GradCAMExplainer] Using backbone '{layer.name}' with {len(self.top_layers)} top layers")
                break

        if self.backbone is None:
            self.backbone = model
            self.top_layers = []

        # Find target layer in backbone and construct grad_model
        try:
            target_layer = self.backbone.get_layer(self.conv_layer_name)
        except Exception:
            conv_layers = [l for l in self.backbone.layers if 'relu' in l.name.lower() or 'conv' in l.name.lower()]
            target_layer = conv_layers[-1] if conv_layers else self.backbone.layers[-1]
            self.conv_layer_name = target_layer.name

        self.grad_model = tf.keras.models.Model(
            inputs=self.backbone.input,
            outputs=[target_layer.output, self.backbone.output]
        )

    def generate_gradcam(self, image_array, class_idx=1, eps=1e-8):
        """Generate Grad-CAM heatmap normalized to [0, 1]."""
        image_array = np.asarray(image_array, dtype=np.float32)
        if len(image_array.shape) == 3:
            image_tensor = tf.cast(np.expand_dims(image_array, axis=0), tf.float32)
        else:
            image_tensor = tf.cast(image_array, tf.float32)

        try:
            with tf.GradientTape() as tape:
                conv_output, backbone_features = self.grad_model(image_tensor)
                tape.watch(conv_output)

                x = tf.keras.layers.GlobalAveragePooling2D()(backbone_features)
                for layer in self.top_layers:
                    if isinstance(layer, tf.keras.layers.GlobalAveragePooling2D):
                        continue
                    x = layer(x)

                # Sigmoid binary output or softmax output
                if len(x.shape) == 2 and x.shape[1] == 1:
                    loss = x[:, 0]
                elif len(x.shape) == 2 and x.shape[1] > 1:
                    loss = x[:, class_idx]
                else:
                    loss = tf.reduce_max(x)

            grads = tape.gradient(loss, conv_output)
            if grads is None:
                return np.ones((224, 224), dtype=np.float32) * 0.5

            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            conv_output_0 = conv_output[0]
            heatmap = conv_output_0 @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)
            heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + eps)
            heatmap_np = heatmap.numpy()

            heatmap_resized = tf.image.resize(heatmap_np[..., np.newaxis], (224, 224)).numpy().squeeze()
            heatmap_max = heatmap_resized.max()
            if heatmap_max > 0:
                heatmap_resized = heatmap_resized / (heatmap_max + eps)
            return heatmap_resized

        except Exception as e:
            print(f"[GradCAM] Generation exception: {e}")
            return np.ones((224, 224), dtype=np.float32) * 0.5
    
    def overlay_gradcam(self, image_array, heatmap, alpha=0.4, colormap=cv2.COLORMAP_JET):
        """Overlay Grad-CAM heatmap on original image."""
        # Handle different image formats
        if isinstance(image_array, tf.Tensor):
            image_array = image_array.numpy()
        
        # Make a copy to avoid modifying original
        img = image_array.copy()
        
        # Ensure image is 224x224
        if img.shape[:2] != (224, 224):
            img = cv2.resize(img, (224, 224))
        
        # Resize heatmap to image size
        heatmap_resized = cv2.resize(heatmap.astype(np.float32), (224, 224))
        
        # Normalize heatmap to 0-255
        heatmap_normalized = (heatmap_resized * 255).astype(np.uint8)
        
        # Apply colormap
        heatmap_colored = cv2.applyColorMap(heatmap_normalized, colormap)
        
        # Ensure image is in correct format
        if img.dtype != np.uint8:
            if img.max() <= 1:
                img = (img * 255).astype(np.uint8)
            else:
                img = img.astype(np.uint8)
        
        # Convert to BGR if needed (assuming input is RGB)
        if len(img.shape) == 3 and img.shape[2] == 3:
            try:
                img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            except cv2.error:
                # If conversion fails, assume already BGR
                img_bgr = img
        else:
            img_bgr = img
        
        # Blend
        overlay = cv2.addWeighted(img_bgr, 1 - alpha, heatmap_colored, alpha, 0)
        
        return overlay
    
    def visualize_explanation(self, image_array, output_path=None):
        """Visualize Grad-CAM explanation."""
        # Generate heatmap
        heatmap = self.generate_gradcam(image_array)
        
        # Create overlay
        overlay = self.overlay_gradcam(image_array, heatmap)
        
        # Plot
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Original image
        if image_array.max() <= 1:
            axes[0].imshow((image_array * 255).astype(np.uint8))
        else:
            axes[0].imshow(image_array.astype(np.uint8))
        axes[0].set_title('Original Image')
        axes[0].axis('off')
        
        # Heatmap
        axes[1].imshow(heatmap, cmap='jet')
        axes[1].set_title('Grad-CAM Heatmap')
        axes[1].axis('off')
        
        # Overlay
        axes[2].imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
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
    model_path = 'models/cnn_image_model.h5'
    if Path(model_path).exists():
        model = keras.models.load_model(model_path)
        explainer = GradCAMExplainer(model)
        
        # Test with random image
        test_image = np.random.rand(224, 224, 3).astype(np.float32)
        explainer.visualize_explanation(test_image, 'results/gradcam_explanation.png')
    else:
        print(f"Model not found at {model_path}")
