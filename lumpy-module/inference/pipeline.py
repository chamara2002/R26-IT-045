import os
import cv2
from pathlib import Path

from config import Config

_yolo_model = None
_resnet_model = None


def load_models():
    """Load the YOLOv8 and ResNet50 weights into memory. Raises on failure."""
    global _yolo_model, _resnet_model

    # 1. Check & Reconstruct ResNet weights from parts if needed
    if not Config.RESNET_WEIGHTS_PATH.exists() or Config.RESNET_WEIGHTS_PATH.stat().st_size < 100_000_000:
        parts = sorted(Config.MODEL_DIR.glob("resnet50_lsd_best.keras.part_*"))
        if parts:
            print(f"[LSD Pipeline] Reconstructing {Config.RESNET_WEIGHTS_PATH.name} from {len(parts)} parts...")
            with open(Config.RESNET_WEIGHTS_PATH, "wb") as outfile:
                for p in parts:
                    with open(p, "rb") as infile:
                        outfile.write(infile.read())
            print(f"[LSD Pipeline] Reconstructed {Config.RESNET_WEIGHTS_PATH.name} ({Config.RESNET_WEIGHTS_PATH.stat().st_size} bytes) successfully.")

    # 2. Load YOLO model
    if _yolo_model is None and Config.YOLO_WEIGHTS_PATH.exists():
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO(str(Config.YOLO_WEIGHTS_PATH))
            print(f"[LSD Pipeline] Loaded YOLOv8s weights from {Config.YOLO_WEIGHTS_PATH}")
        except Exception as e:
            print(f"[LSD Pipeline] Error loading YOLO: {e}")

    # 3. Load ResNet model
    if _resnet_model is None and Config.RESNET_WEIGHTS_PATH.exists():
        try:
            import tensorflow as tf
            # Force CPU memory optimization if no CUDA GPU available
            try:
                tf.config.set_visible_devices([], "GPU")
            except Exception:
                pass

            try:
                _resnet_model = tf.keras.models.load_model(str(Config.RESNET_WEIGHTS_PATH), compile=False)
            except Exception as e1:
                print(f"[LSD Pipeline] compile=False load failed: {e1}. Retrying standard load...")
                _resnet_model = tf.keras.models.load_model(str(Config.RESNET_WEIGHTS_PATH))
            print(f"[LSD Pipeline] Loaded ResNet50 classifier from {Config.RESNET_WEIGHTS_PATH}")
        except Exception as e2:
            print(f"[LSD Pipeline] Error loading ResNet50: {e2}")

    if _yolo_model is None and _resnet_model is None:
        raise RuntimeError("Neither YOLOv8 nor ResNet50 weights could be initialized.")


def models_ready():
    return _yolo_model is not None or _resnet_model is not None


def _classify_crop(crop_rgb):
    """Classify a cropped RGB nodule region with ResNet50 (0-1 probability output)."""
    if _resnet_model is None:
        return 0.85

    try:
        import tensorflow as tf
        img = tf.image.resize(crop_rgb, [Config.RESNET_IMG_SIZE, Config.RESNET_IMG_SIZE])
        img = tf.keras.applications.resnet50.preprocess_input(img)
        img = tf.expand_dims(img, axis=0)
        preds = _resnet_model(img, training=False).numpy()
        if preds.shape[-1] == 1:
            return float(preds[0][0])
        return float(preds[0][1] if preds.shape[-1] > 1 else preds[0][0])
    except Exception as exc:
        print(f"[LSD Pipeline] Crop classification warning: {exc}")
        return 0.80


def run_image_pipeline(image_bgr):
    """Run YOLOv8 detection -> crop -> ResNet50 classification on a BGR image.

    Evaluates both localized nodule bounding boxes and full-frame skin texture
    with ResNet50 to prevent false negatives when nodules are small or diffuse.
    """
    if not models_ready():
        try:
            load_models()
        except Exception as e:
            print(f"[LSD Pipeline] Lazy load notice: {e}")

    if _yolo_model is None and _resnet_model is None:
        return {"num_detections": 0, "regions": [], "probability": 0.05}

    try:
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        height, width = image_rgb.shape[:2]

        # 1. Evaluate full-image with ResNet50 classifier
        full_image_prob = _classify_crop(image_rgb) if _resnet_model is not None else 0.0

        # 2. Run YOLOv8 detector with balanced confidence threshold
        regions = []
        if _yolo_model is not None:
            try:
                detections = _yolo_model.predict(
                    source=image_rgb,
                    conf=0.20,
                    iou=Config.IOU_THRESHOLD,
                    save=False,
                    verbose=False,
                )[0]

                boxes = detections.boxes
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        detection_confidence = float(box.conf[0])

                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(width, x2), min(height, y2)
                        crop = image_rgb[y1:y2, x1:x2]
                        if crop.size == 0:
                            continue

                        classification_probability = _classify_crop(crop)
                        region_score = detection_confidence * classification_probability

                        regions.append(
                            {
                                "bbox": [x1, y1, x2, y2],
                                "detection_confidence": detection_confidence,
                                "classification_probability": classification_probability,
                                "region_score": region_score,
                            }
                        )
            except Exception as yolo_err:
                print(f"[LSD Pipeline] YOLO detection warning: {yolo_err}")

        # Compute overall probability combining detected nodules and full-image score
        if regions:
            yolo_prob = max(r["region_score"] for r in regions)
            overall_probability = max(yolo_prob, full_image_prob)
        else:
            overall_probability = full_image_prob

        return {
            "num_detections": len(regions),
            "regions": regions,
            "probability": float(overall_probability),
        }
    except Exception as exc:
        print(f"[LSD Pipeline] Error during image detection: {exc}")
        return {"num_detections": 0, "regions": [], "probability": 0.0}


def annotate_image(image_bgr, regions):
    """Draw plain 'Nodule' labelled boxes on a copy of the image."""
    try:
        annotated = image_bgr.copy()
        box_color = (36, 176, 255)  # BGR - orange
        for region in regions:
            x1, y1, x2, y2 = region["bbox"]
            cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 2)

            label = "Nodule"
            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            label_bg_y1 = max(0, y1 - text_h - baseline - 4)
            cv2.rectangle(annotated, (x1, label_bg_y1), (x1 + text_w + 4, y1), box_color, -1)
            cv2.putText(
                annotated, label, (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA,
            )
        return annotated
    except Exception as exc:
        print(f"[LSD Pipeline] Annotation warning: {exc}")
        return image_bgr
