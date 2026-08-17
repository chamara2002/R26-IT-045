# CattleSense Mastitis Detection Module

An intelligent multimodal detection module combining deep learning image analysis (Model 1 ResNet-50 CNN), numerical milk biomarker analysis (Model 2 Complete & Missing-Input-Aware MLPs), Grad-CAM visual explainability, and clinical severity staging.

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
├── dataset/
│   ├── mastitis_data.csv           # 800 records (6 numerical biomarker features + class1)
│   └── train/
│       ├── mastitis/               # 572 Udder infection images
│       └── normal/                 # 220 Healthy udder images
├── inference/
│   ├── __init__.py
│   ├── api_config.py               # Backwards-compatible config wrapper
│   ├── hybrid_fusion.py            # Multimodal fusion coordinator (Complete & Missing-Aware)
│   └── prediction_pipeline.py      # End-to-end inference orchestrator
├── models/
│   ├── cnn_image_model.keras                         # [ACTIVE MODEL 1] ResNet-50 CNN (96.6 MB)
│   ├── mlp_numerical_model.keras                     # [MODEL 2 BASELINE] Complete-Input MLP (6 inputs)
│   ├── numerical_preprocessor.pkl                    # StandardScaler for complete-input MLP
│   ├── mlp_numerical_missing_aware.keras             # [MODEL 2 MISSING-AWARE] Missing-Input-Aware MLP (12 inputs)
│   └── numerical_missing_aware_preprocessor.pkl      # Preprocessor (medians + scaler) for missing-aware MLP
├── preprocessing/
│   ├── __init__.py
│   ├── image_preprocessing.py      # Image normalization (224x224x3) & augmentation
│   └── numerical_preprocessing.py  # 6-feature extraction, balancing, StandardScaler
├── training/
│   ├── __init__.py
│   ├── train_cnn_model.py          # Model 1 training script (ResNet-50 transfer learning)
│   ├── train_mlp_model.py          # Model 2 training script (MLP Neural Network)
│   └── train_both_models.py        # Joint training pipeline
├── utils/
│   ├── __init__.py
│   ├── data_explorer.py            # Dataset distribution analysis & visualization
│   ├── gradcam_explainer.py        # Grad-CAM heatmap generation & Jet overlay
│   └── severity_engine.py          # 4-tier clinical severity & protocol engine
├── tests/
│   ├── __init__.py
│   ├── test_model_loading.py       # Model architecture & shape tests
│   ├── test_gradcam.py             # Grad-CAM generation & overlay tests
│   ├── test_pipeline.py            # Multimodal pipeline & missingness fallback tests
│   └── test_api.py                 # Flask REST API endpoint tests
├── uploads/
│   └── heatmaps/
│       └── .gitkeep                # Temporary storage for generated Grad-CAM heatmaps
├── check_results.py                # Fast system status & asset integrity check
├── predict.py                      # Interactive CLI inference runner
├── run_api.py                      # Standalone API server entrypoint
├── requirements.txt                # Pinned Python dependencies
└── README.md                       # Documentation
```

---

## 🧠 Model Architectures & Inference Routing

### Model 1: Udder Image Classifier (Active)
- **Backbone**: `ResNet-50` (Pretrained ImageNet transfer learning)
- **Weights File**: `models/cnn_image_model.keras` (~96.6 MB)
- **Input Dimensions**: `(None, 224, 224, 3)` normalized with ResNet `preprocess_input`
- **Output**: Binary classification (`(None, 1)` Sigmoid / `[0, 1]`)
  - `0`: Normal (Healthy Udder)
  - `1`: Mastitis (Infected Udder)
- **Explainability**: Integrated Grad-CAM hooking directly into the `resnet50` top convolutional layer (`conv5_block3_out`).

### Model 2 (Complete Input): Baseline Numerical Classifier
- **Architecture**: Deep MLP Neural Network (Input 6 -> Dense 64 -> BatchNorm -> Dropout -> Dense 32 -> BatchNorm -> Dropout -> Dense 16 -> Dense 1 Sigmoid)
- **Weights File**: `models/mlp_numerical_model.keras`
- **Preprocessor**: `models/numerical_preprocessor.pkl` (StandardScaler)
- **Activated When**: Exactly **6 of 6** numerical features are available.

### Model 2 (Missing-Input-Aware): Robust Numerical Classifier
- **Architecture**: Deep MLP Neural Network (Input 12 -> Dense 64 -> BatchNorm -> Dropout -> Dense 32 -> BatchNorm -> Dropout -> Dense 16 -> Dense 1 Sigmoid)
- **Weights File**: `models/mlp_numerical_missing_aware.keras`
- **Preprocessor**: `models/numerical_missing_aware_preprocessor.pkl` (contains training medians + StandardScaler)
- **Input Structure (12 values)**:
  - 6 Scaled Numerical Values (missing values imputed with training medians)
  - 6 Missingness Indicators (`0` = Available, `1` = Missing)
- **Activated When**: Exactly **4 or 5 of 6** numerical features are available (1 or 2 missing).

### Fallback Behavior:
- When **3 or more** numerical features are missing (or all missing), numerical Model 2 is cleanly marked unavailable (`model_2_used = false`, `numerical_model_type = "unavailable"`), and the system executes Image-Only prediction using Model 1 + clinical Q&A logic without inserting arbitrary fake defaults.

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

### `POST /api/predict/assisted`
Main multimodal inference endpoint.
- **Form Data (Required)**: `image` (Udder image file or confirmed farmer-selected ROI crop: `.jpg`, `.jpeg`, `.png`)
- **Form Data (Optional)**:
  - `original_image` (Full uncropped photograph for archival and report comparison)
  - `roi_coordinates` / `roi` (JSON string containing `{ "x": int, "y": int, "width": int, "height": int }`)
  - `numerical_measurements` (JSON or individual fields: `milk_temperature`, `milk_ph`, `milk_conductivity`, `somatic_cell_count`, `milk_yield`, `clotting`)
  - `clinical_observations` (JSON or individual fields: `milk_yield_change`, `milk_appearance`, `udder_swelling`, `udder_warmth`, `udder_pain`, `body_temperature`, `appetite`)

### Response Object Fields
```json
{
  "success": true,
  "data": {
    "prediction": "Normal",
    "confidence": 0.7145,
    "stage": "No Mastitis",
    "recommendation": "Cow is healthy. Continue routine monitoring.",
    "roi_applied": true,
    "image_source": "farmer_selected_roi",
    "roi_coordinates": {
      "x": 120,
      "y": 80,
      "width": 650,
      "height": 520
    },
    "model_2_used": true,
    "numerical_analysis_available": true,
    "numerical_model_type": "complete",
    "missing_numerical_features": [],
    "image_prediction": {
      "model": "ResNet-50 CNN (Model 1)",
      "status": "ready",
      "label": 0,
      "prediction": "Normal",
      "confidence": 0.9904,
      "mastitis_confidence": 0.0096
    },
    "numerical_prediction": {
      "model": "MLP Numerical Network (Model 2)",
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
  - `report_id` (Optional): Custom Report ID (e.g. `RPT-MAST-12345678`)
- **Visual Evidence (Section 4)**:
  - **Panel A**: Original Farmer Photograph
  - **Panel B**: Farmer-Selected Udder ROI (Model 1 Focus Area)
  - **Panel C**: Grad-CAM Activation Heatmap
  - **Panel D**: Heatmap / ROI Overlay
- **Response**: Streamed PDF document (`application/pdf`) with `Content-Disposition: attachment; filename="CattleSense-Mastitis-Report-*.pdf"`.

### `GET /api/heatmap/<heatmap_id>`
Retrieves the generated Grad-CAM heatmap PNG image.

