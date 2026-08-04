"""
Local training script for the LSD ResNet-50 classifier.

Adapted from Complete_LSD_Detection_ResNet50.ipynb (Component 3 - LSD Detection,
IT22282422) for headless/local execution instead of Google Colab. Architecture,
transforms and normalization are kept identical to the notebook so the exported
weights are a drop-in match for the inference pipeline.

Usage:
    venv/Scripts/python.exe training/train_resnet50.py --data-dir "D:/Research/LSD_Dataset/LSD_Dataset" --epochs 15
"""
import argparse
import json
import os
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score,
)
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models

MODULE_ROOT = Path(__file__).resolve().parent.parent
CLASS_NAMES = {0: "Healthy Skin", 1: "Lumpy Skin Disease"}

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class LumpySkinDataset(Dataset):
    """Cattle skin image dataset (Healthy_skin vs Lumpy_skin folders)."""

    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        image = Image.open(self.image_paths[idx]).convert("RGB")
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label


def build_transforms():
    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.RandomResizedCrop(224, scale=(0.85, 1.0)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    return train_transforms, val_transforms


def load_dataset(data_dir):
    healthy_dir = os.path.join(data_dir, "Healthy_skin")
    lumpy_dir = os.path.join(data_dir, "Lumpy_skin")

    image_paths, labels = [], []
    for img_file in sorted(os.listdir(healthy_dir)):
        if img_file.lower().endswith((".png", ".jpg", ".jpeg")):
            image_paths.append(os.path.join(healthy_dir, img_file))
            labels.append(0)
    for img_file in sorted(os.listdir(lumpy_dir)):
        if img_file.lower().endswith((".png", ".jpg", ".jpeg")):
            image_paths.append(os.path.join(lumpy_dir, img_file))
            labels.append(1)

    print(f"Loaded dataset: {len(image_paths)} images "
          f"({labels.count(0)} healthy / {labels.count(1)} lumpy)")
    return image_paths, labels


def create_resnet50_model(num_classes=2, pretrained=True):
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, num_classes)
    return model


def run_epoch(model, loader, criterion, optimizer, device, train):
    model.train() if train else model.eval()
    running_loss = 0.0
    running_corrects = 0

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for inputs, labels in loader:
            inputs, labels = inputs.to(device), labels.to(device)
            if train:
                optimizer.zero_grad()

            outputs = model(inputs)
            loss = criterion(outputs, labels)
            _, preds = torch.max(outputs, 1)

            if train:
                loss.backward()
                optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data).item()

    epoch_loss = running_loss / len(loader.dataset)
    epoch_acc = running_corrects / len(loader.dataset)
    return epoch_loss, epoch_acc


def evaluate(model, loader, device):
    model.eval()
    all_preds, all_labels, all_probs = [], [], []
    with torch.no_grad():
        for inputs, labels in loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())

    accuracy = accuracy_score(all_labels, all_preds)
    precision = precision_score(all_labels, all_preds, zero_division=0)
    recall = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(all_labels, all_preds, labels=[0, 1]).ravel()
    specificity = tn / (tn + fp) if (tn + fp) else 0.0
    pos_probs = [p[1] for p in all_probs]
    try:
        auc = roc_auc_score(all_labels, pos_probs)
    except ValueError:
        auc = float("nan")

    return {
        "accuracy": accuracy, "precision": precision, "recall": recall,
        "f1_score": f1, "specificity": specificity, "auc_roc": auc,
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
        "n_samples": len(all_labels),
    }


def main():
    parser = argparse.ArgumentParser(description="Train ResNet-50 LSD classifier")
    parser.add_argument("--data-dir", default=str(MODULE_ROOT.parent / "LSD_Dataset"),
                         help="Directory containing Healthy_skin/ and Lumpy_skin/ subfolders")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--out-dir", default=str(MODULE_ROOT / "models"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    image_paths, labels = load_dataset(args.data_dir)

    train_paths, temp_paths, train_labels, temp_labels = train_test_split(
        image_paths, labels, test_size=0.3, stratify=labels, random_state=args.seed
    )
    val_paths, test_paths, val_labels, test_labels = train_test_split(
        temp_paths, temp_labels, test_size=0.5, stratify=temp_labels, random_state=args.seed
    )
    print(f"Split -> train: {len(train_paths)}, val: {len(val_paths)}, test: {len(test_paths)}")

    train_transforms, val_transforms = build_transforms()
    train_dataset = LumpySkinDataset(train_paths, train_labels, train_transforms)
    val_dataset = LumpySkinDataset(val_paths, val_labels, val_transforms)
    test_dataset = LumpySkinDataset(test_paths, test_labels, val_transforms)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model = create_resnet50_model(num_classes=2, pretrained=True).to(device)

    # Dataset is imbalanced (far more Lumpy than Healthy samples) - weight the loss
    # so the minority (Healthy) class isn't drowned out.
    class_counts = np.bincount(train_labels, minlength=2)
    class_weights = torch.tensor(
        [len(train_labels) / (2.0 * c) if c > 0 else 0.0 for c in class_counts],
        dtype=torch.float32, device=device,
    )
    print(f"Class counts (train): healthy={class_counts[0]}, lumpy={class_counts[1]}")
    print(f"Class weights: {class_weights.tolist()}")

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=max(1, args.epochs // 3), gamma=0.1)

    best_val_acc = 0.0
    best_state = None
    start = time.time()

    for epoch in range(args.epochs):
        epoch_start = time.time()
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_acc = run_epoch(model, val_loader, criterion, optimizer, device, train=False)
        scheduler.step()

        marker = ""
        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            marker = " *best*"

        print(f"Epoch {epoch + 1}/{args.epochs} "
              f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
              f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} "
              f"({time.time() - epoch_start:.1f}s){marker}")

    print(f"Training complete in {(time.time() - start) / 60:.1f} min. Best val acc: {best_val_acc:.4f}")

    model.load_state_dict(best_state)
    test_metrics = evaluate(model, test_loader, device)
    print("Test metrics:", json.dumps(test_metrics, indent=2))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    weights_path = out_dir / "resnet50_lsd_model.pth"
    torch.save(model.state_dict(), weights_path)
    print(f"Saved weights: {weights_path}")

    metadata = {
        "architecture": "resnet50",
        "num_classes": 2,
        "class_names": CLASS_NAMES,
        "image_size": [224, 224],
        "normalize_mean": IMAGENET_MEAN,
        "normalize_std": IMAGENET_STD,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "epochs": args.epochs,
        "best_val_accuracy": best_val_acc,
        "test_metrics": test_metrics,
        "dataset_size": {
            "total": len(image_paths),
            "train": len(train_paths),
            "val": len(val_paths),
            "test": len(test_paths),
            "healthy_total": labels.count(0),
            "lumpy_total": labels.count(1),
        },
    }
    metadata_path = out_dir / "resnet50_lsd_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata: {metadata_path}")


if __name__ == "__main__":
    main()
