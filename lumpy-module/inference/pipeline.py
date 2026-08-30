import os
from pathlib import Path
import cv2

# Configure Ultralytics to avoid cloud/container permission issues and offline telemetry hangs
os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/Ultralytics")
os.environ.setdefault("ULTRALYTICS_AUTOINSTALL", "0")
os.environ.setdefault("SETTINGS_OFF", "1")
try:
    Path("/tmp/Ultralytics").mkdir(parents=True, exist_ok=True)
except Exception:
    pass

from config import Config, BASE_DIR

_yolo_model = None
_resnet_model = None


def _find_yolo_weights():
    """Find the YOLOv8 LSD weights across potential runtime locations or reassemble from parts."""
    candidates = [
        Config.YOLO_WEIGHTS_PATH,
        BASE_DIR / "models" / "yolov8s_lsd_best.pt",
        Path("/app/models/yolov8s_lsd_best.pt"),
        Path.cwd() / "models" / "yolov8s_lsd_best.pt",
        Path.cwd() / "lumpy-module" / "models" / "yolov8s_lsd_best.pt",
        Path("/tmp/yolov8s_lsd_best.pt"),
        Path(__file__).resolve().parent.parent / "models" / "yolov8s_lsd_best.pt",
    ]
    for c in candidates:
        if c.exists() and c.is_file() and c.stat().st_size > 10_000_000:
            return c

    # Reconstruct from split parts if needed
    model_dirs = [
        Config.MODEL_DIR,
        BASE_DIR / "models",
        Path("/app/models"),
        Path.cwd() / "models",
        Path.cwd() / "lumpy-module" / "models",
        Path(__file__).resolve().parent.parent / "models",
    ]
    for mdir in model_dirs:
        if not mdir.exists():
            continue
        parts = sorted(mdir.glob("yolov8s_lsd_best.pt.part_*"))
        if parts:
            targets = [mdir / "yolov8s_lsd_best.pt", Path("/tmp/yolov8s_lsd_best.pt")]
            for target_path in targets:
                try:
                    print(f"[LSD Pipeline] Reconstructing YOLO {target_path.name} from {len(parts)} parts...")
                    with open(target_path, "wb") as outfile:
                        for p in parts:
                            with open(p, "rb") as infile:
                                outfile.write(infile.read())
                    if target_path.exists() and target_path.stat().st_size > 10_000_000:
                        print(f"[LSD Pipeline] Reconstructed {target_path} ({target_path.stat().st_size} bytes) successfully.")
                        return target_path
                except Exception as part_err:
                    print(f"[LSD Pipeline] Could not write YOLO to {target_path}: {part_err}")

    # Broad search for any .pt weights
    for mdir in model_dirs:
        if mdir.exists():
            for pt in mdir.glob("*.pt"):
                if pt.is_file() and pt.stat().st_size > 10_000_000:
                    return pt
    return None


def _find_resnet_weights():
    """Find or reassemble the ResNet50 classifier weights."""
    candidates = [
        Config.RESNET_WEIGHTS_PATH,
        BASE_DIR / "models" / "resnet50_lsd_best.keras",
        Path("/app/models/resnet50_lsd_best.keras"),
        Path.cwd() / "models" / "resnet50_lsd_best.keras",
        Path.cwd() / "lumpy-module" / "models" / "resnet50_lsd_best.keras",
        Path("/tmp/resnet50_lsd_best.keras"),
    ]
    for c in candidates:
        if c.exists() and c.is_file() and c.stat().st_size > 100_000_000:
            return c

    # Reconstruct from split parts if needed
    model_dirs = [
        Config.MODEL_DIR,
        BASE_DIR / "models",
        Path("/app/models"),
        Path.cwd() / "models",
        Path.cwd() / "lumpy-module" / "models",
        Path(__file__).resolve().parent.parent / "models",
    ]
    for mdir in model_dirs:
        parts = sorted(mdir.glob("resnet50_lsd_best.keras.part_*"))
        if parts:
            # Try to write in model dir, fall back to /tmp if read-only
            targets = [mdir / "resnet50_lsd_best.keras", Path("/tmp/resnet50_lsd_best.keras")]
            for target_path in targets:
                try:
                    print(f"[LSD Pipeline] Reconstructing {target_path.name} from {len(parts)} parts...")
                    with open(target_path, "wb") as outfile:
                        for p in parts:
                            with open(p, "rb") as infile:
                                outfile.write(infile.read())
                    if target_path.exists() and target_path.stat().st_size > 100_000_000:
                        print(f"[LSD Pipeline] Reconstructed {target_path} ({target_path.stat().st_size} bytes) successfully.")
                        return target_path
                except Exception as part_err:
                    print(f"[LSD Pipeline] Could not write to {target_path}: {part_err}")
    return None


def _load_yolo():
    """Load the YOLOv8 LSD detector."""
    global _yolo_model
    weights_path = _find_yolo_weights()
    if weights_path is None:
        print("[LSD Pipeline] Notice: yolov8s_lsd_best.pt was not found.")
        return False

    try:
        from ultralytics import YOLO
        _yolo_model = YOLO(str(weights_path))
        print(f"[LSD Pipeline] Loaded YOLOv8s weights from {weights_path}")
        return True
    except Exception as e:
        print(f"[LSD Pipeline] Error loading YOLO from {weights_path}: {e}")
        return False


def _load_resnet():
    """Load the ResNet50 classifier."""
    global _resnet_model
    weights_path = _find_resnet_weights()
    if weights_path is None:
        print("[LSD Pipeline] Notice: resnet50_lsd_best.keras was not found.")
        return False

    try:
        import tensorflow as tf
        try:
            tf.config.set_visible_devices([], "GPU")
        except Exception:
            pass

        try:
            _resnet_model = tf.keras.models.load_model(str(weights_path), compile=False)
        except Exception as e1:
            print(f"[LSD Pipeline] compile=False load failed: {e1}. Retrying standard load...")
            _resnet_model = tf.keras.models.load_model(str(weights_path))
        print(f"[LSD Pipeline] Loaded ResNet50 classifier from {weights_path}")
        return True
    except Exception as e2:
        print(f"[LSD Pipeline] Error loading ResNet50: {e2}")
        return False


def load_models():
    """Load the YOLOv8 and ResNet50 weights into memory. Robust against partial/read-only environments."""
    _load_yolo()
    _load_resnet()

    if _yolo_model is None and _resnet_model is None:
        raise RuntimeError("Neither YOLOv8 nor ResNet50 weights could be initialized.")


def models_ready():
    return _yolo_model is not None or _resnet_model is not None


def _classify_crop(crop_rgb):
    """Classify a cropped RGB nodule region with ResNet50 (0-1 probability output)."""
    global _resnet_model
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


def _extract_boxes_from_detections(detections, width, height, image_rgb):
    """Helper to safely parse bounding boxes from an ultralytics detections object."""
    extracted = []
    if detections is None or getattr(detections, "boxes", None) is None or len(detections.boxes) == 0:
        return extracted

    for box in detections.boxes:
        try:
            xyxy_raw = box.xyxy[0].tolist() if hasattr(box.xyxy[0], "tolist") else list(box.xyxy[0])
            x1, y1, x2, y2 = [int(round(float(v))) for v in xyxy_raw[:4]]
            conf = float(box.conf[0]) if hasattr(box, "conf") and len(box.conf) > 0 else 0.5

            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(width, x2), min(height, y2)
            if (x2 - x1) < 4 or (y2 - y1) < 4:
                continue

            crop = image_rgb[y1:y2, x1:x2]
            classification_probability = _classify_crop(crop) if crop.size > 0 else 0.80
            region_score = conf * classification_probability

            extracted.append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "detection_confidence": conf,
                    "classification_probability": classification_probability,
                    "region_score": region_score,
                }
            )
        except Exception as box_err:
            print(f"[LSD Pipeline] Box parsing warning: {box_err}")

    return extracted


def run_image_pipeline(image_bgr):
    """Run YOLOv8 detection -> crop -> ResNet50 classification on a BGR image.

    Evaluates both localized nodule bounding boxes and full-frame skin texture
    with ResNet50 to prevent false negatives when nodules are small or diffuse.
    """
    global _yolo_model, _resnet_model

    # Ensure YOLO is actively loaded if missing
    if _yolo_model is None:
        try:
            _load_yolo()
        except Exception as e:
            print(f"[LSD Pipeline] YOLO lazy load notice: {e}")

    # Ensure ResNet is loaded if missing
    if _resnet_model is None:
        try:
            _load_resnet()
        except Exception as e:
            print(f"[LSD Pipeline] ResNet lazy load notice: {e}")

    if _yolo_model is None and _resnet_model is None:
        return {"num_detections": 0, "regions": [], "probability": 0.05}

    try:
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        height, width = image_rgb.shape[:2]

        # 1. Evaluate full-image with ResNet50 classifier
        full_image_prob = _classify_crop(image_rgb) if _resnet_model is not None else 0.0

        # 2. Run YOLOv8 detector with sensitive threshold
        regions = []
        if _yolo_model is not None:
            try:
                detections = _yolo_model.predict(
                    source=image_rgb,
                    conf=0.10,
                    iou=Config.IOU_THRESHOLD,
                    save=False,
                    verbose=False,
                )[0]
                regions = _extract_boxes_from_detections(detections, width, height, image_rgb)

                # If no boxes detected at conf=0.10 but full image shows high risk, run sensitive second pass
                if not regions and full_image_prob >= Config.LOW_RISK_MAX:
                    try:
                        second_pass = _yolo_model.predict(
                            source=image_rgb,
                            conf=0.06,
                            iou=Config.IOU_THRESHOLD,
                            save=False,
                            verbose=False,
                        )[0]
                        regions = _extract_boxes_from_detections(second_pass, width, height, image_rgb)
                    except Exception:
                        pass
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
    """Draw high-visibility 'Nodule' labelled boxes with resolution-adaptive line thickness."""
    try:
        annotated = image_bgr.copy()
        h, w = annotated.shape[:2]
        
        # Adaptive scaling based on image dimensions
        max_dim = max(h, w)
        thickness = max(2, int(round(max_dim / 260)))
        font_scale = max(0.55, max_dim / 950.0)
        font_thickness = max(1, int(round(thickness / 2)))

        box_color = (0, 140, 255)  # BGR - vibrant orange/amber
        
        for region in regions:
            bbox = region.get("bbox") if isinstance(region, dict) else (region if isinstance(region, (list, tuple)) else None)
            if not bbox or len(bbox) < 4:
                continue

            x1, y1, x2, y2 = [int(round(float(v))) for v in bbox[:4]]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            if (x2 - x1) <= 0 or (y2 - y1) <= 0:
                continue

            cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, thickness)

            label = "Nodule"

            (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)
            text_x = min(x1, max(0, w - text_w))
            text_y = y1 - baseline - int(thickness)
            if text_y - text_h < 0:
                # Not enough room above the box (near the top edge or a very
                # small box) — place the label just inside the top instead.
                text_y = y1 + text_h + int(thickness)

            # No filled background: a black outline stroke behind the colored
            # text keeps it readable on any backdrop without the solid boxes
            # that stack into a wall of orange when regions sit close together.
            outline_thickness = font_thickness + 1
            cv2.putText(
                annotated, label, (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), outline_thickness, cv2.LINE_AA,
            )
            cv2.putText(
                annotated, label, (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, box_color, font_thickness, cv2.LINE_AA,
            )
        return annotated
    except Exception as exc:
        print(f"[LSD Pipeline] Annotation warning: {exc}")
        return image_bgr

