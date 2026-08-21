from pathlib import Path
import json

from src.utils.dataset_inspector import summarize_dataset
from src.utils.file_utils import save_json


def main() -> None:
    dataset_dir = Path(__file__).resolve().parent.parent / "models" / "dataset"
    summary = summarize_dataset(dataset_dir)

    print("Dataset summary")
    print("===============")
    print(f"Dataset path: {summary['dataset_path']}")
    print(f"Total images: {summary['total_images']}")
    print(f"Classes: {summary['class_names']}")
    print(f"Samples per class: {summary['samples_per_class']}")
    print(f"Dominant class: {summary['dominant_class']} ({summary['dominance_count']})")
    print(f"Least common class: {summary['least_class']} ({summary['least_count']})")
    print(f"Imbalance ratio: {summary['imbalance_ratio']}")
    print(f"Imbalance detected: {summary['has_imbalance']}")

    output_path = Path(__file__).resolve().parent.parent / "models" / "dataset_summary.json"
    save_json(output_path, summary)
    print(f"Saved dataset summary to: {output_path}")


if __name__ == "__main__":
    main()
