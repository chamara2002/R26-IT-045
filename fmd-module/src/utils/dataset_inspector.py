import os
import re
from pathlib import Path
from collections import Counter
from typing import Dict, List, Tuple

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

# Most filenames in this dataset (e.g. "Diseased tongue 7.jpg") have no
# reliable animal/case identifier - each is presumed to be its own case.
# A minority follow a "<N> day <vesicle/lesion stage>, <animal>, <body part>"
# naming convention (e.g. "2 day vesicle, steer, foot.jpg" and
# "2 day vesicle, steer, gum.jpg") that documents multiple photos of the
# SAME case at the same disease-day taken at different body sites. Those are
# grouped so grouped train/test splitting keeps every photo of one case on
# the same side of the split (see src/training/train.py).
_CASE_PATTERN = re.compile(r"^(\d+(-\d+)? day .*?, (steer|cow|calf))", re.IGNORECASE)


def group_key_for_image(class_name: str, path: Path) -> str:
    """Best-effort same-case grouping key. Falls back to a unique key per
    image (i.e. "assume no grouping") when no case pattern is recognised -
    this is a documented limitation, not a guarantee of correct grouping."""
    match = _CASE_PATTERN.match(path.stem)
    if match:
        return f"{class_name}:{match.group(1).strip().lower()}"
    return f"{class_name}:{path.stem.lower()}"


def _list_image_files(folder: Path) -> List[Path]:
    return [
        path
        for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]


def summarize_dataset(dataset_dir: Path) -> Dict[str, object]:
    """Inspect a folder-structured dataset and return class and sample statistics."""
    if not dataset_dir.exists() or not dataset_dir.is_dir():
        raise FileNotFoundError(f"Dataset folder not found: {dataset_dir}")

    classes = []
    class_counts = Counter()
    class_paths: Dict[str, List[Path]] = {}

    for child in sorted(dataset_dir.iterdir()):
        if child.is_dir():
            images = _list_image_files(child)
            if not images:
                continue
            class_name = child.name
            classes.append(class_name)
            class_counts[class_name] = len(images)
            class_paths[class_name] = sorted(images)

    if not class_counts:
        raise ValueError(f"No image classes found in dataset at {dataset_dir}")

    total_images = sum(class_counts.values())
    dominant_class = class_counts.most_common(1)[0]
    least_class = class_counts.most_common()[-1]
    imbalance_ratio = dominant_class[1] / least_class[1] if least_class[1] > 0 else float("inf")

    return {
        "dataset_path": str(dataset_dir),
        "total_images": total_images,
        "class_names": classes,
        "samples_per_class": dict(class_counts),
        "dominant_class": dominant_class[0],
        "least_class": least_class[0],
        "dominance_count": dominant_class[1],
        "least_count": least_class[1],
        "imbalance_ratio": round(imbalance_ratio, 2),
        "has_imbalance": imbalance_ratio > 1.5,
        "class_paths": {cls: [str(path) for path in paths] for cls, paths in class_paths.items()},
    }


def get_image_paths_and_labels(dataset_dir: Path) -> Tuple[List[Path], List[str]]:
    """Return all image paths and their corresponding class labels."""
    summary = summarize_dataset(dataset_dir)
    paths: List[Path] = []
    labels: List[str] = []

    for class_name, class_images in summary["class_paths"].items():
        for image_path in class_images:
            paths.append(Path(image_path))
            labels.append(class_name)

    return paths, labels


def get_image_paths_labels_and_groups(dataset_dir: Path) -> Tuple[List[Path], List[str], List[str]]:
    """Like get_image_paths_and_labels, plus a same-case group key per image
    for leakage-aware grouped train/test splitting (see group_key_for_image)."""
    summary = summarize_dataset(dataset_dir)
    paths: List[Path] = []
    labels: List[str] = []
    groups: List[str] = []

    for class_name, class_images in summary["class_paths"].items():
        for image_path in class_images:
            path = Path(image_path)
            paths.append(path)
            labels.append(class_name)
            groups.append(group_key_for_image(class_name, path))

    return paths, labels, groups
