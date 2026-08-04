import argparse
import json
from pathlib import Path
from typing import Tuple

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras import layers, models, regularizers
from tensorflow.keras.applications import EfficientNetB0, MobileNetV2
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

from src.preprocessing.image_pipeline import augment_image, load_image_path
from src.utils.dataset_inspector import get_image_paths_and_labels
from src.utils.file_utils import ensure_dir, save_json, save_pickle


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "data" / "dataset"
MODEL_DIR = BASE_DIR / "models"
DEFAULT_IMAGE_SIZE = 160
BATCH_SIZE = 32
BASE_EPOCHS = 12
FINE_TUNE_EPOCHS = 12
FOLDS = 3
TEST_RATIO = 0.15
RANDOM_SEED = 42


def build_backbone(name: str, input_shape: Tuple[int, int, int]):
    if name.lower() == "efficientnet":
        return EfficientNetB0(input_shape=input_shape, include_top=False, weights="imagenet")
    return MobileNetV2(input_shape=input_shape, include_top=False, weights="imagenet")


def build_model(input_shape: Tuple[int, int, int], num_classes: int, backbone_name: str) -> models.Model:
    data_augmentation = models.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.1),
            layers.RandomZoom(0.12),
            layers.RandomTranslation(0.08, 0.08),
            layers.RandomContrast(0.15),
        ],
        name="data_augmentation",
    )

    base_model = build_backbone(backbone_name, input_shape=input_shape)
    base_model.trainable = False

    inputs = layers.Input(shape=input_shape)
    x = data_augmentation(inputs)
    x = layers.Rescaling(2.0, offset=-1)(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(256, activation="relu", kernel_regularizer=regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def load_dataset(paths, labels, target_size: Tuple[int, int]) -> Tuple[np.ndarray, np.ndarray]:
    images = [load_image_path(Path(image_path), target_size) for image_path in paths]
    return np.stack(images, axis=0), np.array(labels, dtype=np.int32)


def build_augmented_dataset(images, labels):
    augmented, augmented_labels = [], []
    for image, label in zip(images, labels):
        augmented.append(image)
        augmented_labels.append(label)
        if np.random.rand() < 0.6:
            augmented.append(augment_image(image))
            augmented_labels.append(label)
    return np.stack(augmented, axis=0), np.array(augmented_labels, dtype=np.int32)


def train_fold(
    fold_index: int,
    train_paths,
    train_labels,
    val_paths,
    val_labels,
    target_size: Tuple[int, int],
    backbone_name: str,
    base_epochs: int,
    fine_tune_epochs: int,
):
    print(f"\n=== Fold {fold_index + 1} / {FOLDS} ===")
    x_train, y_train = load_dataset(train_paths, train_labels, target_size)
    x_val, y_val = load_dataset(val_paths, val_labels, target_size)
    x_train, y_train = build_augmented_dataset(x_train, y_train)

    model = build_model((*target_size, 3), num_classes=len(np.unique(train_labels)), backbone_name=backbone_name)
    model.summary()

    fold_checkpoint = MODEL_DIR / f"{backbone_name}_fold_{fold_index + 1}.h5"
    callbacks = [
        EarlyStopping(monitor="val_loss", patience=6, restore_best_weights=True),
        ModelCheckpoint(str(fold_checkpoint), save_best_only=True, monitor="val_loss"),
    ]

    history = model.fit(
        x_train,
        y_train,
        validation_data=(x_val, y_val),
        epochs=base_epochs,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=2,
    )

    if fine_tune_epochs > 0:
        print("Starting fine-tuning phase...")
        base_model = model.layers[3]
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False

        model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-5),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )

        fine_history = model.fit(
            x_train,
            y_train,
            validation_data=(x_val, y_val),
            epochs=fine_tune_epochs,
            batch_size=BATCH_SIZE,
            callbacks=callbacks,
            verbose=2,
        )

        history.history["loss"].extend(fine_history.history["loss"])
        history.history["accuracy"].extend(fine_history.history["accuracy"])
        history.history["val_loss"].extend(fine_history.history["val_loss"])
        history.history["val_accuracy"].extend(fine_history.history["val_accuracy"])

    val_predictions = np.argmax(model.predict(x_val, verbose=0), axis=1)
    report = classification_report(y_val, val_predictions, output_dict=True)
    return model, history.history, report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train FMD detection model with cross-validation and transfer learning.")
    parser.add_argument("--backbone", choices=["mobilenet", "efficientnet"], default="efficientnet")
    parser.add_argument("--image-size", type=int, default=DEFAULT_IMAGE_SIZE)
    parser.add_argument("--base-epochs", type=int, default=BASE_EPOCHS)
    parser.add_argument("--fine-tune-epochs", type=int, default=FINE_TUNE_EPOCHS)
    parser.add_argument("--folds", type=int, default=FOLDS)
    args = parser.parse_args()

    ensure_dir(MODEL_DIR)

    print("Inspecting dataset...")
    image_paths, image_labels = get_image_paths_and_labels(DATASET_DIR)
    print(f"Total images: {len(image_paths)}")
    if len(image_paths) < 100:
        print("Warning: FMD dataset appears small. Larger datasets improve generalization.")

    label_encoder = LabelEncoder()
    encoded_labels = label_encoder.fit_transform(image_labels)

    train_paths, test_paths, train_labels, test_labels = train_test_split(
        image_paths,
        encoded_labels,
        test_size=TEST_RATIO,
        stratify=encoded_labels,
        random_state=RANDOM_SEED,
    )

    results = []
    skf = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=RANDOM_SEED)
    for fold_index, (train_idx, val_idx) in enumerate(skf.split(train_paths, train_labels)):
        fold_train_paths = [train_paths[i] for i in train_idx]
        fold_train_labels = [train_labels[i] for i in train_idx]
        fold_val_paths = [train_paths[i] for i in val_idx]
        fold_val_labels = [train_labels[i] for i in val_idx]

        _, history, report = train_fold(
            fold_index,
            fold_train_paths,
            fold_train_labels,
            fold_val_paths,
            fold_val_labels,
            target_size=(args.image_size, args.image_size),
            backbone_name=args.backbone,
            base_epochs=args.base_epochs,
            fine_tune_epochs=args.fine_tune_epochs,
        )

        results.append({
            "fold": fold_index + 1,
            "val_accuracy": report["accuracy"],
            "report": report,
        })

    print("\nCross-validation complete.")
    save_json(MODEL_DIR / "cross_validation_report.json", {"results": results})

    print("Training final model on all training data...")
    x_train, y_train = load_dataset(train_paths, train_labels, (args.image_size, args.image_size))
    x_test, y_test = load_dataset(test_paths, test_labels, (args.image_size, args.image_size))
    x_train, y_train = build_augmented_dataset(x_train, y_train)

    final_model = build_model((args.image_size, args.image_size, 3), num_classes=len(label_encoder.classes_), backbone_name=args.backbone)
    final_checkpoint = MODEL_DIR / f"final_{args.backbone}.h5"
    callbacks = [
        EarlyStopping(monitor="val_loss", patience=6, restore_best_weights=True),
        ModelCheckpoint(str(final_checkpoint), save_best_only=True, monitor="val_loss"),
    ]

    final_history = final_model.fit(
        x_train,
        y_train,
        validation_data=(x_test, y_test),
        epochs=args.base_epochs,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=2,
    )

    base_model = final_model.layers[3]
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    final_model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    fine_tune_history = final_model.fit(
        x_train,
        y_train,
        validation_data=(x_test, y_test),
        epochs=args.fine_tune_epochs,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=2,
    )

    final_model_path = MODEL_DIR / "fmd_model.h5"
    final_model.save(str(final_model_path))
    save_pickle(MODEL_DIR / "label_encoder.pkl", label_encoder)
    save_json(
        MODEL_DIR / "test_paths.json",
        {"paths": [str(path) for path in test_paths], "labels": list(map(int, test_labels))},
    )

    training_history = {
        "accuracy": final_history.history["accuracy"] + fine_tune_history.history["accuracy"],
        "val_accuracy": final_history.history["val_accuracy"] + fine_tune_history.history["val_accuracy"],
        "loss": final_history.history["loss"] + fine_tune_history.history["loss"],
        "val_loss": final_history.history["val_loss"] + fine_tune_history.history["val_loss"],
    }
    save_json(MODEL_DIR / "train_history.json", training_history)
    save_json(MODEL_DIR / "model_metadata.json", {
        "backbone": args.backbone,
        "image_size": args.image_size,
        "test_ratio": TEST_RATIO,
        "class_names": list(label_encoder.classes_),
    })

    print(f"Final model saved to {final_model_path}")
    print(f"Cross-validation report saved to {MODEL_DIR / 'cross_validation_report.json'}")


if __name__ == "__main__":
    main()
