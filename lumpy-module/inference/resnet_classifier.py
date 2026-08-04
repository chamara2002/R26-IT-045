"""
ResNet-50 image classifier for Lumpy Skin Disease (LSD) detection.

Loads the locally-trained weights produced by training/train_resnet50.py
(same architecture as Complete_LSD_Detection_ResNet50.ipynb: torchvision
resnet50 with the final FC layer replaced for 2-class classification).
"""
import json
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from inference.api_config import get_config

config = get_config()


def build_model(num_classes=2):
    model = models.resnet50(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, num_classes)
    return model


class ResNetLSDClassifier:
    """Loads the trained ResNet-50 weights and exposes image-based LSD prediction."""

    def __init__(self, weights_path=None, metadata_path=None):
        self.weights_path = Path(weights_path) if weights_path else config.RESNET_WEIGHTS_PATH
        self.metadata_path = Path(metadata_path) if metadata_path else config.RESNET_METADATA_PATH

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.metadata = None
        self.model = None

        self.transform = transforms.Compose([
            transforms.Resize(config.IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(mean=config.NORMALIZE_MEAN, std=config.NORMALIZE_STD),
        ])

        self._load()

    def _load(self):
        if not self.weights_path.exists():
            raise FileNotFoundError(
                f"ResNet-50 weights not found at {self.weights_path}. "
                f"Run training/train_resnet50.py first."
            )

        model = build_model(num_classes=2)
        state_dict = torch.load(self.weights_path, map_location=self.device)
        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()
        self.model = model

        if self.metadata_path.exists():
            with open(self.metadata_path) as f:
                self.metadata = json.load(f)

    def preprocess(self, pil_image):
        """PIL.Image (RGB) -> normalized tensor batch of shape (1, 3, 224, 224)."""
        tensor = self.transform(pil_image.convert("RGB"))
        return tensor.unsqueeze(0).to(self.device)

    def predict(self, pil_image):
        """Run the classifier on a single PIL image.

        Returns:
            label (int): 0 = Healthy, 1 = LSD
            confidence (float): softmax confidence of the predicted class
            lsd_probability (float): softmax probability of the LSD class (1)
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")

        input_tensor = self.preprocess(pil_image)
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]

        label = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[label].item())
        lsd_probability = float(probabilities[1].item())

        return label, confidence, lsd_probability

    def predict_tensor(self, input_tensor):
        """Run the classifier on an already-preprocessed, batched tensor (used by Grad-CAM)."""
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]
        label = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[label].item())
        lsd_probability = float(probabilities[1].item())
        return label, confidence, lsd_probability
