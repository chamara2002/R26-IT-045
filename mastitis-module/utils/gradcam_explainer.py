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

        # For models with ResNet backbone, we need special handling
        self.resnet_backbone = None
        if isinstance(model.layers[0], keras.Model) and 'resnet' in model.layers[0].name.lower():
            self.resnet_backbone = model.layers[0]
            self.conv_layer_name = self.resnet_backbone.name
            print(f"[GradCAMExplainer] Using ResNet backbone '{self.conv_layer_name}' for Grad-CAM")
        else:
            # Find the last convolutional layer
            conv_layer = None
            for layer in reversed(model.layers):
                layer_type = layer.__class__.__name__
                if 'Conv' in layer_type or ('Pool' in layer_type and 'Global' not in layer_type):
                    conv_layer = layer
                    break
            
            if conv_layer is None:
                raise ValueError("Could not find convolutional layer for Grad-CAM")
            
            self.conv_layer_name = conv_layer.name
            print(f"[GradCAMExplainer] Using layer '{self.conv_layer_name}' for Grad-CAM")
    
    def generate_gradcam(self, image_array, class_idx=1, eps=1e-8):
        """Generate Grad-CAM heatmap."""
        if len(image_array.shape) == 3:
            image_array = np.expand_dims(image_array, axis=0)
        
        # Convert to tensor - don't use Variable for eager mode
        image_tensor = tf.cast(image_array, tf.float32)
        
        with tf.GradientTape() as tape:
            tape.watch(image_tensor)
            
            # Get full model prediction
            predictions = self.model(image_tensor, training=False)
            
            # Get loss for the class (handle different output shapes)
            if len(predictions.shape) == 2 and predictions.shape[1] > 1:
                loss = predictions[0, class_idx]
            else:
                loss = tf.reduce_max(predictions)
        
        # Get gradients w.r.t. input image
        image_grads = tape.gradient(loss, image_tensor)
        
        # Now get intermediate outputs by calling model with eager execution
        # Create an intermediate model that outputs ResNet features
        with tf.GradientTape() as tape2:
            # Call ResNet directly
            if self.resnet_backbone is not None:
                conv_outputs = self.resnet_backbone(image_tensor, training=False)
                tape2.watch(conv_outputs)
            else:
                conv_outputs = self.model.layers[0](image_tensor, training=False)
                tape2.watch(conv_outputs)
            
            # Get predictions based on conv outputs
            # Simulate what the rest of the model does
            x = conv_outputs
            for layer in self.model.layers[1:]:
                x = layer(x, training=False) if hasattr(layer, 'training') else layer(x)
            
            predictions = x
            if len(predictions.shape) == 2 and predictions.shape[1] > 1:
                loss = predictions[0, class_idx]
            else:
                loss = tf.reduce_max(predictions)
        
        # Compute gradients
        grads = tape2.gradient(loss, conv_outputs)
        
        if grads is None:
            print(f"[GradCAM] Warning: gradients are None for class_idx={class_idx}")
            print(f"[GradCAM] Conv output shape: {conv_outputs.shape}")
            # Use a simple gradient-based approach via input image gradients
            if image_grads is not None and len(image_grads.shape) == 4:
                # Use input gradient magnitude as fallback
                input_grad_mag = tf.reduce_mean(tf.abs(image_grads), axis=-1)[0]
                return input_grad_mag.numpy()
            spatial_dims = conv_outputs.shape[1:3] if len(conv_outputs.shape) >= 3 else (7, 7)
            return np.ones(spatial_dims) * 0.5
        
        # Global average pooling of gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Compute weighted sum of feature maps
        conv_outputs_0 = conv_outputs[0]  # Get first sample: (height, width, channels)
        heatmap = tf.reduce_sum(tf.multiply(pooled_grads, conv_outputs_0), axis=-1)
        
        # Normalize heatmap
        heatmap_max = tf.reduce_max(heatmap)
        if heatmap_max > 0:
            heatmap = heatmap / (heatmap_max + eps)
        else:
            heatmap = tf.ones_like(heatmap) * 0.5
            
        heatmap = tf.maximum(heatmap, 0)
        
        return heatmap.numpy()
    
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
