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
        self.layer_name = layer_name

        if not model.layers:
            raise ValueError("Model has no layers for Grad-CAM generation")

        self.resnet_backbone = None
        self.top_layers = []
        self.conv_layer_name = None

        # Check if model has a ResNet backbone (at layer 0, or nested)
        for i, layer in enumerate(model.layers):
            if 'resnet' in layer.name.lower():
                self.resnet_backbone = layer
                self.conv_layer_name = layer.name
                self.top_layers = model.layers[i + 1:]
                print(f"[GradCAMExplainer] Using ResNet backbone '{self.conv_layer_name}' with {len(self.top_layers)} top layers")
                break

        if self.resnet_backbone is None:
            # Find the last convolutional layer
            conv_layer = None
            conv_idx = -1
            for i, layer in enumerate(model.layers):
                layer_type = layer.__class__.__name__
                if 'Conv' in layer_type or ('Pool' in layer_type and 'Global' not in layer_type):
                    conv_layer = layer
                    conv_idx = i

            if conv_layer is None:
                # Fallback: check if layer_name was provided
                if layer_name:
                    try:
                        self.conv_layer_name = layer_name
                        print(f"[GradCAMExplainer] Using explicitly specified layer '{self.conv_layer_name}'")
                    except Exception:
                        pass
                if self.conv_layer_name is None:
                    # Generic fallback to use input layer gradients
                    self.conv_layer_name = model.layers[0].name
                    print(f"[GradCAMExplainer] Using fallback layer '{self.conv_layer_name}'")
            else:
                self.conv_layer_name = conv_layer.name
                self.top_layers = model.layers[conv_idx + 1:]
                print(f"[GradCAMExplainer] Using convolutional layer '{self.conv_layer_name}'")

    def generate_gradcam(self, image_array, class_idx=1, eps=1e-8):
        """Generate Grad-CAM heatmap."""
        image_array = np.asarray(image_array)
        if len(image_array.shape) == 3:
            image_array = np.expand_dims(image_array, axis=0)

        image_tensor = tf.cast(image_array, tf.float32)

        try:
            if self.resnet_backbone is not None and self.top_layers:
                # Grad-CAM through ResNet backbone + top classifier
                with tf.GradientTape() as tape:
                    try:
                        conv_outputs = self.resnet_backbone(image_tensor)
                    except Exception:
                        conv_outputs = self.resnet_backbone(image_tensor, training=False)
                    tape.watch(conv_outputs)

                    x = conv_outputs
                    for layer in self.top_layers:
                        try:
                            x = layer(x)
                        except Exception:
                            x = layer(x, training=False)

                    # Handle binary sigmoid (shape: (1, 1)) vs multi-class (shape: (1, N))
                    if len(x.shape) == 2 and x.shape[1] == 1:
                        loss = x[0, 0]
                    elif len(x.shape) == 2 and x.shape[1] > 1:
                        loss = x[0, class_idx]
                    else:
                        loss = tf.reduce_max(x)

                grads = tape.gradient(loss, conv_outputs)
            else:
                # Direct model gradient tape
                with tf.GradientTape() as tape:
                    tape.watch(image_tensor)
                    predictions = self.model(image_tensor, training=False)
                    if len(predictions.shape) == 2 and predictions.shape[1] == 1:
                        loss = predictions[0, 0]
                    elif len(predictions.shape) == 2 and predictions.shape[1] > 1:
                        loss = predictions[0, class_idx]
                    else:
                        loss = tf.reduce_max(predictions)

                image_grads = tape.gradient(loss, image_tensor)
                if image_grads is not None:
                    heatmap = tf.reduce_mean(tf.abs(image_grads), axis=-1)[0]
                    heatmap = tf.maximum(heatmap, 0)
                    heatmap_max = tf.reduce_max(heatmap)
                    if heatmap_max > 0:
                        heatmap = heatmap / (heatmap_max + eps)
                    return heatmap.numpy()
                return np.ones((7, 7), dtype=np.float32) * 0.5

            if grads is None:
                print(f"[GradCAM] Warning: gradients are None for class_idx={class_idx}")
                spatial_dims = conv_outputs.shape[1:3] if len(conv_outputs.shape) >= 3 else (7, 7)
                return np.ones(spatial_dims, dtype=np.float32) * 0.5

            # Global average pooling of gradients
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

            # Compute weighted sum of feature maps
            conv_outputs_0 = conv_outputs[0]
            heatmap = tf.reduce_sum(tf.multiply(pooled_grads, conv_outputs_0), axis=-1)

            # ReLU & Normalize heatmap
            heatmap = tf.maximum(heatmap, 0)
            heatmap_max = tf.reduce_max(heatmap)
            if heatmap_max > 0:
                heatmap = heatmap / (heatmap_max + eps)
            else:
                heatmap = tf.ones_like(heatmap) * 0.5

            return heatmap.numpy()

        except Exception as e:
            print(f"[GradCAM] Generation exception: {e}")
            return np.ones((7, 7), dtype=np.float32) * 0.5
    
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
