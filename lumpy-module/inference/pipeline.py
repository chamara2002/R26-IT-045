"""YOLOv8 + ResNet50 lesion detection/classification pipeline for LSD.

Replicates the pipeline validated in this project's Colab notebooks
(see ipynb files/INTEGRATED_PIPELINE_v4_Final.ipynb): YOLOv8 localises
candidate nodules, each detected region is cropped and classified by
ResNet50, and detection confidence is combined with classification
probability per region (region_score = detection_confidence *
classification_probability). The overall image probability is the MAX
region score across all detected regions, not the average — the notebook
found averaging silently diluted genuine detections.
"""
import cv2

from config import Config

_yolo_model = None
_resnet_model = None


def load_models():
    """Load the YOLOv8 and ResNet50 weights into memory. Raises on failure."""
    global _yolo_model, _resnet_model

    from ultralytics import YOLO
    import tensorflow as tf

    if not Config.YOLO_WEIGHTS_PATH.exists():
        raise FileNotFoundError(f"YOLOv8 weights not found at {Config.YOLO_WEIGHTS_PATH}")
    if not Config.RESNET_WEIGHTS_PATH.exists():
        parts = sorted(Config.MODEL_DIR.glob("resnet50_lsd_best.keras.part_*"))
        if parts:
            print(f"[LSD Pipeline] Reconstructing {Config.RESNET_WEIGHTS_PATH.name} from {len(parts)} parts...")
            with open(Config.RESNET_WEIGHTS_PATH, "wb") as outfile:
                for p in parts:
                    with open(p, "rb") as infile:
                        outfile.write(infile.read())
            print(f"[LSD Pipeline] Reconstructed {Config.RESNET_WEIGHTS_PATH.name} successfully.")
    if not Config.RESNET_WEIGHTS_PATH.exists():
        raise FileNotFoundError(f"ResNet50 weights not found at {Config.RESNET_WEIGHTS_PATH}")

    _yolo_model = YOLO(str(Config.YOLO_WEIGHTS_PATH))
    _resnet_model = tf.keras.models.load_model(str(Config.RESNET_WEIGHTS_PATH))


def models_ready():
    return _yolo_model is not None and _resnet_model is not None


def _classify_crop(crop_rgb):
    """Classify a cropped RGB nodule region with ResNet50 (0-1 sigmoid output)."""
    import tensorflow as tf

    img = tf.image.resize(crop_rgb, [Config.RESNET_IMG_SIZE, Config.RESNET_IMG_SIZE])
    img = tf.keras.applications.resnet50.preprocess_input(img)
    img = tf.expand_dims(img, axis=0)
    return float(_resnet_model.predict(img, verbose=0)[0][0])


def run_image_pipeline(image_bgr):
    """Run YOLOv8 detection -> crop -> ResNet50 classification on a BGR image.

    Returns a dict with num_detections, regions (bbox, detection_confidence,
    classification_probability, region_score) and the overall probability.
    """
    if not models_ready():
        raise RuntimeError("LSD models are not loaded")

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    detections = _yolo_model.predict(
        source=image_rgb,
        conf=Config.CONF_THRESHOLD,
        iou=Config.IOU_THRESHOLD,
        save=False,
        verbose=False,
    )[0]

    boxes = detections.boxes
    if boxes is None or len(boxes) == 0:
        return {"num_detections": 0, "regions": [], "probability": 0.0}

    height, width = image_rgb.shape[:2]
    regions = []
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

    if not regions:
        return {"num_detections": 0, "regions": [], "probability": 0.0}

    overall_probability = max(region["region_score"] for region in regions)

    return {
        "num_detections": len(regions),
        "regions": regions,
        "probability": overall_probability,
    }


def annotate_image(image_bgr, regions):
    """Draw plain 'Nodule' labelled boxes on a copy of the image.

    The raw per-region classification probability is currently
    overconfident/miscalibrated (see ipynb files/
    RESNET50_LSD_CLASSIFICATION_Final.ipynb notes — near-1.0 on almost
    every crop from class imbalance in training data), so it is
    deliberately never drawn on the image or shown to end users. Only the
    combined, meaningful overall probability is surfaced elsewhere in the
    API response.
    """
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
