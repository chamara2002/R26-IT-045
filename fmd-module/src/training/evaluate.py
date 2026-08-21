import json
from pathlib import Path
from typing import Tuple

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from tensorflow.keras.models import load_model

from src.preprocessing.image_pipeline import load_image_path
from src.utils.file_utils import load_json, load_pickle


BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "models" / "model"
LABEL_ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"
DEFAULT_TARGET_SIZE = (160, 160)


def load_test_split() -> Tuple[list[str], list[int]]:
    test_file = MODEL_DIR / "test_paths.json"
    if not test_file.exists():
        raise FileNotFoundError("Missing test split metadata. Run training first.")

    content = load_json(test_file)
    return content["paths"], content["labels"]


def load_metadata() -> dict:
    metadata_path = MODEL_DIR / "model_metadata.json"
    if metadata_path.exists():
        return load_json(metadata_path)
    return {}


def load_images_and_labels(paths: list[str], target_size: Tuple[int, int]) -> np.ndarray:
    images = [load_image_path(Path(path), target_size) for path in paths]
    return np.stack(images, axis=0)


def plot_history(history_path: Path) -> None:
    if not history_path.exists():
        return

    history = load_json(history_path)
    plt.figure(figsize=(10, 4))

    plt.subplot(1, 2, 1)
    plt.plot(history["accuracy"], label="train")
    plt.plot(history["val_accuracy"], label="validation")
    plt.title("Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(history["loss"], label="train")
    plt.plot(history["val_loss"], label="validation")
    plt.title("Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()

    plt.tight_layout()
    plt.savefig(MODEL_DIR / "training_history.png")
    plt.close()


def plot_confusion(cm: np.ndarray, classes: list[str]) -> None:
    plt.figure(figsize=(6, 6))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("Confusion Matrix")
    plt.colorbar()
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes, rotation=45)
    plt.yticks(tick_marks, classes)

    thresh = cm.max() / 2
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j,
                i,
                format(cm[i, j], "d"),
                horizontalalignment="center",
                color="white" if cm[i, j] > thresh else "black",
            )

    plt.ylabel("True label")
    plt.xlabel("Predicted label")
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "confusion_matrix.png")
    plt.close()


def main() -> None:
    model_file = MODEL_DIR / "fmd_model.h5"
    if not model_file.exists():
        raise FileNotFoundError("Trained model not found. Run training first.")

    print("Loading model...")
    model = load_model(model_file)
    metadata = load_metadata()
    if isinstance(metadata.get("image_size"), int):
        target_size = (metadata["image_size"], metadata["image_size"])
    else:
        target_size = DEFAULT_TARGET_SIZE
        print(f"No image_size in model metadata; using fallback target size {DEFAULT_TARGET_SIZE}.")

    test_paths, test_labels = load_test_split()
    x_test = load_images_and_labels(test_paths, target_size)
    y_test = np.array(test_labels, dtype=np.int32)

    if not LABEL_ENCODER_PATH.exists():
        raise FileNotFoundError("Label encoder not found. Run training first.")
    label_encoder = load_pickle(LABEL_ENCODER_PATH)
    class_names = list(label_encoder.classes_)
    fmd_class_index = class_names.index("1") if "1" in class_names else 1

    print("Running evaluation...")
    predictions = model.predict(x_test, verbose=0)
    y_pred = np.argmax(predictions, axis=1)

    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred)

    # ROC-AUC needs both classes present in y_test to be defined.
    roc_auc = None
    if len(np.unique(y_test)) == 2:
        roc_auc = float(roc_auc_score(y_test, predictions[:, fmd_class_index]))

    fmd_metrics = report.get("1", report.get(str(fmd_class_index), {}))

    report_data = {
        "classification_report": report,
        "accuracy": report["accuracy"],
        "macro_avg": report["macro avg"],
        "weighted_avg": report["weighted avg"],
        "roc_auc": roc_auc,
        "fmd_class_metrics": {
            "precision": fmd_metrics.get("precision"),
            "recall": fmd_metrics.get("recall"),
            "f1_score": fmd_metrics.get("f1-score"),
            "support": fmd_metrics.get("support"),
            "note": "Recall is the most important figure here: it's the share of true FMD cases the model did not miss (false negatives).",
        },
        "test_set_size": int(len(y_test)),
    }

    baseline_path = MODEL_DIR.parent.parent / "archive" / "baseline-ungrouped-split" / "evaluation_report.json"
    if baseline_path.exists():
        baseline = load_json(baseline_path)
        report_data["compared_to_previous_ungrouped_split_baseline"] = {
            "baseline_accuracy": baseline.get("accuracy"),
            "current_accuracy": report["accuracy"],
            "note": (
                "Baseline used a plain per-image split (possible same-case leakage across "
                "train/test); current run uses a grouped split. Do not conclude 'improvement' "
                "from an accuracy delta alone here — the two numbers are evaluated on different "
                "test sets and are not directly comparable, only indicative."
            ),
        }

    save_path = MODEL_DIR / "evaluation_report.json"
    with open(save_path, "w", encoding="utf-8") as handle:
        json.dump(report_data, handle, indent=2)

    plot_history(MODEL_DIR / "train_history.json")
    plot_confusion(cm, class_names)

    print("Evaluation complete.")
    print(f"Accuracy: {report['accuracy']:.4f} | ROC-AUC: {roc_auc}")
    print(f"FMD (class 1) precision/recall/F1: {fmd_metrics.get('precision')}/{fmd_metrics.get('recall')}/{fmd_metrics.get('f1-score')}")
    print(f"Saved evaluation report to {save_path}")
    print(f"Saved confusion matrix to {MODEL_DIR / 'confusion_matrix.png'}")
    print(f"Saved training history graph to {MODEL_DIR / 'training_history.png'}")


if __name__ == "__main__":
    main()
