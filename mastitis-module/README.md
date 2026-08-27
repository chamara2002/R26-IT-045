# CattleSense Mastitis Detection Module

An intelligent multimodal detection module combining deep learning image analysis (Model 1 MobileNetV2), numerical clinical analysis (Model 2 Logistic Regression Pipeline), Grad-CAM visual explainability, and clinical severity staging.

---

## 📁 Module Directory Structure

```
mastitis-module/
├── api/
│   ├── __init__.py
│   └── flask_api.py                # REST API Server (Port 5002)
├── config/
│   ├── __init__.py
│   └── config.py                   # Central configuration & schema definitions
├── docs/
│   ├── metrics.json                # Model 1 test set evaluation metrics
│   └── training_history.json       # Model 1 training history
├── inference/
│   ├── __init__.py
│   ├── api_config.py               # Backwards-compatible config wrapper
│   ├── hybrid_fusion.py            # Multimodal fusion coordinator
│   └── prediction_pipeline.py      # End-to-end inference orchestrator
├── models/
│   ├── model1/
│   │   ├── mastitis_image_model.keras  # [ACTIVE MODEL 1] MobileNetV2 (10.5 MB)
│   │   ├── class_names.json            # Class mapping ("0": "normal", "1": "mastitis")
│   │   ├── preprocessing_config.json   # Aspect-ratio letterbox resize & normalization
│   │   ├── threshold.json              # Classification threshold (0.50)
│   │   └── gradcam_explainer.py        # Grad-CAM explainer module
│   └── model2/
│       ├── decision_tree_model.joblib  # [ACTIVE MODEL 2] Decision Tree Classifier
│       ├── model2_metadata.json        # Model 2 metadata & feature definitions
│       └── model2_feature_order.json   # Model 2 feature sequence
├── preprocessing/
│   ├── __init__.py
│   ├── image_preprocessing.py      # Letterbox resize & MobileNetV2 normalization
│   └── numerical_preprocessing.py  # 5-feature extraction & preprocessing
├── utils/
│   ├── __init__.py
│   ├── data_explorer.py            # Dataset distribution analysis & visualization
│   ├── gradcam_explainer.py        # Grad-CAM heatmap generation & Jet overlay
│   ├── report_generator.py         # Veterinary PDF report generator
│   └── severity_engine.py          # 4-tier clinical severity & protocol engine
├── tests/
│   ├── __init__.py
│   ├── test_model_loading.py       # Model architecture & config tests
│   ├── test_gradcam.py             # Grad-CAM generation & overlay tests
│   ├── test_pipeline.py            # Multimodal pipeline & fallback tests
│   ├── test_api.py                 # Flask REST API endpoint tests
│   ├── test_report_generator.py    # Veterinary PDF report tests
│   ├── test_roi_selection.py       # ROI cropping & 4-panel visual tests
│   └── test_severity_guidance_and_reports.py # Clinical guidance tests
├── uploads/
│   └── heatmaps/                   # Generated Grad-CAM heatmaps & visual evidence
├── check_results.py                # System status & asset integrity check
├── predict.py                      # Interactive CLI inference runner
├── run_api.py                      # Standalone API server entrypoint
├── requirements.txt                # Pinned Python dependencies
└── README.md                       # Documentation
```

---

## 🧠 Model Architectures & Inference Routing

### Model 1: Udder Image Classifier (Active)
- **Architecture**: `MobileNetV2 (Stage 1, frozen backbone)`
- **Weights File**: `models/model1/mastitis_image_model.keras` (~10.5 MB)
- **Preprocessing**: Aspect-ratio-preserving letterbox padding to `(224, 224, 3)` with `[128, 128, 128]` fill, normalized via `mobilenet_v2.preprocess_input` to `[-1, 1]`.
- **Classification Threshold**: `0.50` (loaded dynamically from `models/model1/threshold.json`)
- **Class Mapping**: `0: normal`, `1: mastitis` (loaded dynamically from `models/model1/class_names.json`)
- **Performance (Test Set, N=120)**:
  - Accuracy: `90.0%`
  - Precision: `91.95%`
  - Recall: `94.12%`
  - Specificity: `80.0%`
  - F1 Score: `93.02%`
  - ROC AUC: `0.9640`
  - PR AUC: `0.9857`
- **Explainability**: Integrated Grad-CAM hooking directly into MobileNetV2 `block_13_expand_relu` layer.

### Model 2: Clinical Numerical Classifier (Active)
- **Architecture**: Decision Tree Classifier (`sklearn.tree.DecisionTreeClassifier`)
- **Weights File**: `models/model2/decision_tree_model.joblib`
- **Required Features (Exact Sequence)**:
  1. `Milk_Temperature`: Float (fresh milk temperature in °C; valid bounds: 30.0 – 45.0 °C, normal range: 35.0 – 37.0 °C)
  2. `Milk_pH`: Float (milk pH / acidity; valid bounds: 6.0 – 8.0, normal fresh milk: 6.5 – 6.8)
  3. `Milk_Conductivity`: Float (milk electrical conductivity in mS/cm; valid bounds: 3.0 – 10.0 mS/cm, normal: 4.0 – 5.5 mS/cm)
  4. `Milk_Yield`: Float (daily milk yield in L/day; valid bounds: 0.0 – 50.0 L/day)
  5. `Clotting`: Integer (`0`: No clotting/normal, `1`: Visible clots or flakes present)

### Multimodal Fusion Strategy:
- When both udder image and all 5 numerical features are provided:
  $$\text{Fused Probability} = \frac{\text{Model 1 Probability} + \text{Model 2 Probability}}{2.0}$$
- When numerical features are omitted, clean fallback to **Model 1 Image-Only** prediction without fabricating fake default values.
- When image is omitted, clean fallback to **Model 2 Numerical-Only** prediction.
- When partial or invalid numerical features are supplied, requests are strictly validated and rejected (400 Bad Request) to avoid arbitrary fake defaults.

---

## 🚀 Running the Module

### 1. Verification & Diagnostics
```bash
# Check all module files, models, datasets, and preprocessors
python check_results.py

# Run CLI prediction demo
python predict.py
```

### 2. Running the API Server
```bash
# Starts the Flask REST API on port 5002 (host 0.0.0.0)
python run_api.py
```

### 3. Running Automated Tests
```bash
pytest tests/ -v
```

---

## 🌐 API Specification

### `GET /api/health`
Checks API and model loading status.
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "v1",
    "port": 5002,
    "models_ready": {
      "model_1_cnn": true,
      "model_2_mlp": true,
      "model_2_missing_aware": true
    }
  }
}
```

### `POST /predict` / `POST /api/predict/numerical`
Direct inference endpoint for the 4-feature Logistic Regression Sklearn Pipeline.
- **Payload (Required JSON or Form fields)**:
  - `Breed`: String categorical (`Jersey`, `hostlene`)
  - `Months after giving birth`: Integer ($\ge 0$)
  - `Previous_Mastits_status`: Integer (0 = no prior mastitis, 1 = prior mastitis)
  - `Temperature`: Float (bovine body/rectal temperature in °C)

### `POST /api/predict/assisted`
Main assisted inference endpoint combining optional udder photograph and the 4 required features.
- **Form Data (Required)**:
  - `Breed`
  - `Months after giving birth`
  - `Previous_Mastits_status`
  - `Temperature`
- **Form Data (Optional)**:
  - `image` (Udder photograph or confirmed farmer-selected ROI crop: `.jpg`, `.jpeg`, `.png`)
  - `original_image` (Full uncropped photograph for archival and report comparison)
  - `roi_coordinates` / `roi` (JSON string containing `{ "x": int, "y": int, "width": int, "height": int }`)
  - `clinical_observations` (JSON or individual fields: `milk_yield_change`, `milk_appearance`, `udder_swelling`, `udder_warmth`, `udder_pain`, `appetite`)

### Response Object Fields
```json
{
  "success": true,
  "data": {
    "prediction": "Normal",
    "predicted_class": "Normal",
    "confidence": 1.0,
    "normal_probability": 1.0,
    "mastitis_probability": 0.0,
    "stage": "Normal",
    "recommendation": "No mastitis detected. Continue routine udder hygiene and monitor the cow regularly.",
    "roi_applied": true,
    "image_source": "farmer_selected_roi",
    "model_2_used": true,
    "numerical_analysis_available": true,
    "image_prediction": {
      "model": "ResNet-50 CNN (Model 1)",
      "status": "ready",
      "label": 0,
      "prediction": "Normal",
      "confidence": 0.9904
    },
    "numerical_prediction": {
      "model": "Logistic Regression Pipeline (Model 2)",
      "status": "ready",
      "label": 1,
      "prediction": "Mastitis",
      "confidence": 0.7061,
      "mastitis_confidence": 0.7061,
      "model_type": "complete",
      "missing_features": []
    },
    "heatmap_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

### `POST /api/report/generate-pdf`
Generates a structured, multi-page **Mastitis Assessment & Veterinary Review Report** (PDF format).
- **Request Body (JSON)**:
  - `result` (Required): Full prediction result dictionary from `/api/predict/assisted` (including ROI metadata)
  - `cattle_info` (Optional): Registered cattle metadata (`tag_id`, `name`, `breed`, `age`, `current_lactation`, etc.)
  - `farmer_info` (Optional): Registered farmer metadata (`name`, `farm_name`, `district`, `phone`)
  - `heatmap_id` (Optional): UUID of generated Grad-CAM heatmap (automatically locates `_orig.png`, `_crop.png`, `_heat.png`, and overlay `.png`)
  - `report_id` (Optional): Custom Report ID (e.g. `RPT-MST-20260825-001`)
- **Visual Evidence (Section 4)**:
  - **Panel A**: Original Farmer Photograph
  - **Panel B**: Farmer-Selected Udder ROI (Model 1 Focus Area)
  - **Panel C**: Grad-CAM Activation Heatmap
  - **Panel D**: Heatmap / ROI Overlay
- **Response**: Streamed PDF document (`application/pdf`) with `Content-Disposition: attachment; filename="CattleSense-Mastitis-Report-*.pdf"`.

### `GET /api/heatmap/<heatmap_id>`
Retrieves the generated Grad-CAM heatmap PNG image.

