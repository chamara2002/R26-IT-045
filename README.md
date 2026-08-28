# CattleSense: An Intelligent Multimodal Machine Learning & IoT Framework for Early Detection of Bovine Diseases

[![Research Group](https://img.shields.io/badge/Research%20Group-R26--IT--045-blue.svg)](#-research-team--module-responsibilities)
[![Backend](https://img.shields.io/badge/Backend-Flask%203.1%20%7C%20Python%203.11-green.svg)](#-technology-stack)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-61DAFB.svg)](#-technology-stack)
[![AI/ML](https://img.shields.io/badge/AI%2FML-TensorFlow%20%7C%20YOLOv8%20%7C%20XGBoost%20%7C%20Scikit--Learn-FF6F00.svg)](#-machine-learning-modules--research-methodology)
[![Containerization](https://img.shields.io/badge/Docker-Compose%20Orchestration-2496ED.svg)](#-deployment--getting-started)
[![Cloud Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Neon%20Cloud-00E599.svg)](#-cloud-and-database-infrastructure)
[![Deployment](https://img.shields.io/badge/Cloud%20Ready-AWS%20EC2%20%7C%20Vercel-FF9900.svg)](#-aws-vm-cloud-deployment-guide)

---

## 📋 Table of Contents
1. [Executive Summary & Abstract](#-executive-summary--abstract)
2. [Research Team & Module Responsibilities](#-research-team--module-responsibilities)
3. [System Architecture](#-system-architecture)
4. [Machine Learning Modules & Research Methodology](#-machine-learning-modules--research-methodology)
   - [Module 1: Mastitis Detection & Severity Engine](#1-mastitis-detection--severity-engine)
   - [Module 2: Foot and Mouth Disease (FMD) & Environmental Risk](#2-foot-and-mouth-disease-fmd--environmental-risk)
   - [Module 3: Lumpy Skin Disease (LSD) Vision Pipeline](#3-lumpy-skin-disease-lsd-vision-pipeline)
   - [Module 4: Milk Fever Staging & Ensemble Classification](#4-milk-fever-bovine-hypocalcemia-staging)
5. [Microservices Port Matrix & Inter-Service Communication](#-microservices-port-matrix)
6. [Technology Stack](#-technology-stack)
7. [Deployment & Getting Started](#-deployment--getting-started)
   - [Quickstart with Docker Compose (Recommended)](#option-a-one-command-docker-compose-stack-recommended)
   - [Hybrid Development Mode](#option-b-local-hybrid-development-mode)
   - [AWS VM (EC2) Production Deployment Guide](#option-c-aws-ec2-virtual-machine-deployment)
8. [REST API Specification](#-rest-api-specification)
9. [Experimental Evaluation & Performance Metrics](#-experimental-evaluation--performance-metrics)
10. [Security, Fault Tolerance & Privacy](#-security-fault-tolerance--privacy)
11. [Repository Structure](#-repository-structure)

---

## 🔬 Executive Summary & Abstract

Bovine diseases—specifically **Mastitis, Foot-and-Mouth Disease (FMD), Lumpy Skin Disease (LSD), and Milk Fever (Bovine Hypocalcemia)**—represent major threats to global dairy production, livestock welfare, and agricultural economies. Delayed diagnosis leads to severe milk yield drops, irreversible tissue necrosis, rapid viral contagion, and high mortality rates.

**CattleSense** is a distributed, multimodal microservice platform engineered for early-stage detection, risk prediction, and clinical decision support. The platform integrates:
1. **Computer Vision**: Deep convolutional networks (ResNet50, MobileNetV2, CNN) and object localization models (YOLOv8) for lesion, vesicle, and udder inflammation detection.
2. **Biomarker & Physiological Telemetry**: Machine learning classifiers (Random Forest, XGBoost, Decision Trees) analyzing milk conductivity, pH, temperature, blood minerals, parity, and nutritional DCAD scores.
3. **Environmental Risk Fusion**: Live meteorological telemetry integration (temperature, humidity, wind velocity) aligned with Department of Animal Production and Health (DAPH) Sri Lanka seasonal epidemiological guidelines.
4. **Model Explainability & Reporting**: Visual Grad-CAM Jet saliency heatmaps for diagnostic transparency, accompanied by automated bilingual (English & Sinhala) veterinary PDF report generation.

---

## 👥 Research Team & Module Responsibilities

**Academic Group ID**: `R26-IT-045`  
**Institution**: Sri Lanka Institute of Information Technology (SLIIT)  
**Specialization**: BSc (Hons) in Information Technology / Software Engineering / Data Science

| Student ID | Member Name | Assigned Research Component | Core Methodology & Technologies | Port | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IT22153036** | **Perera L. C. C.** | **Mastitis Detection Module** *(Lead)* | ResNet50 / MobileNetV2 CNN + Decision Tree (5 Biomarkers) + Grad-CAM Heatmaps + OpenType PDF Engine | `5002` | ✅ **Active** |
| **IT22129512** | **Sudasinghe D. D.** | **Foot & Mouth Disease (FMD)** | Custom CNN Image Classifier + Open-Meteo Weather Risk + Clinical Heuristic Fusion | `5005` | ✅ **Active** |
| **IT22282422** | **Manathunga M. A. A. S.** | **Lumpy Skin Disease (LSD)** | YOLOv8s Nodule Localization + ResNet50 Feature Classifier + Symptom Assessment Fusion | `5003` | ✅ **Active** |
| **IT22221728** | **Udawaththa M. P. A. M.** | **Milk Fever Module** | Soft-Voting Ensemble (RandomForest + XGBoost) with SMOTE Rebalancing (4-Tier Staging) | `5004` | ✅ **Active** |

---

## 🏗️ System Architecture

CattleSense follows an enterprise **Microservices & API Gateway Architecture**. The Frontend and external callers interface exclusively with the **Backend API Gateway (Port 5001)**, which manages authentication, access control, database ORM operations, and proxies inference requests to the isolated ML services across a private Docker bridge network (`cattlesense-net`).

```mermaid
graph TD
    Client[Web Browser / Mobile Client] -->|HTTPS / REST API| Frontend[Hosted Frontend: React 18 + Vite SPA]
    Frontend -->|JWT Authenticated Calls| Gateway[Backend API Gateway :5001]
    
    subgraph Docker Containerized Stack (AWS EC2 / Local VM)
        Gateway -->|Internal DNS: http://mastitis-service:5002| Mastitis[Mastitis ML Microservice :5002<br/>ResNet50 + DecisionTree + Grad-CAM]
        Gateway -->|Internal DNS: http://fmd-service:5005| FMD[FMD ML Microservice :5005<br/>CNN + Weather Analysis Engine]
        Gateway -->|Internal DNS: http://lumpy-service:5003| Lumpy[LSD ML Microservice :5003<br/>YOLOv8s + ResNet50 Vision Pipeline]
        Gateway -->|Internal DNS: http://milk-fever-service:5004| MilkFever[Milk Fever ML Microservice :5004<br/>RandomForest + XGBoost Ensemble]
    end
    
    Gateway -->|Direct TLS / SSL Connection| CloudDB[(Neon Cloud PostgreSQL Database)]
    Gateway -->|Transactional Email API| ResendAPI[Resend Email Service]
    FMD -->|Live Meteorological Data| OpenMeteo[Open-Meteo Weather API]
```

---

## 🧠 Machine Learning Modules & Research Methodology

### 1. Mastitis Detection & Severity Engine
* **Directory**: `mastitis-module/` | **Port**: `5002`
* **Lead Researcher**: IT22153036 - Perera L. C. C.
* **Multimodal Architecture**:
  * **Image Vision (Model 1)**: MobileNetV2 / ResNet50 deep learning model fine-tuned on udder imagery with aspect-ratio letterboxing and ImageNet standard normalization.
  * **Biomarker Analysis (Model 2)**: Supervised Decision Tree Classifier trained on 5 key physiological variables:
    1. Milk Temperature ($^\circ\text{C}$)
    2. Milk pH
    3. Electrical Conductivity ($\text{mS/cm}$)
    4. Milk Yield ($\text{L/day}$)
    5. Clotting Index (0/1)
  * **Explainability & Transparency**: Grad-CAM (Gradient-weighted Class Activation Mapping) generates high-resolution Jet colormap overlays highlighting inflamed udder quadrants.
  * **Clinical Severity Staging**: Classifies health status into *Normal*, *Subclinical*, *Mild Mastitis*, and *Severe Mastitis* with automated treatment advice and PDF clinical report generation.

### 2. Foot and Mouth Disease (FMD) & Environmental Risk
* **Directory**: `fmd-module/` | **Port**: `5005`
* **Lead Researcher**: IT22129512 - Sudasinghe D. D.
* **Architecture & Methodology**:
  * **Image Classification**: Fine-tuned Convolutional Neural Network (CNN) scoring oral, hoof, and muzzle lesions as `0` (Healthy) or `1` (Lesions consistent with FMD).
  * **Environmental Risk Engine**: Real-time integration with Open-Meteo assessing regional ambient temperature, relative humidity, and wind vectors against DAPH Sri Lanka seasonal epidemiological patterns.
  * **Deterministic Clinical Fusion**: Fuses vision probability with farmer-reported clinical signs (fever, salivation, feeding reduction, lameness).

### 3. Lumpy Skin Disease (LSD) Vision Pipeline
* **Directory**: `lumpy-module/` | **Port**: `5003`
* **Lead Researcher**: IT22282422 - Manathunga M. A. A. S.
* **Two-Stage Vision Architecture**:
  * **Stage 1 (Nodule Localization)**: YOLOv8s bounding-box detector identifying cutaneous nodule candidates across the bovine hide.
  * **Stage 2 (Nodule Verification)**: Crops candidate regions and runs ResNet50 feature classification.
  * **Scoring Heuristic**: Computes overall probability as $\max(\text{Region Score}_i)$ to prevent dilution of genuine localized nodules.
  * **Hybrid Symptom Layer**: Weighted fusion ($70\%$ vision $+ 30\%$ clinical symptoms) with multi-tier risk output (Low, Moderate, High Risk).

### 4. Milk Fever (Bovine Hypocalcemia) Staging
* **Directory**: `milk-fever-module/` | **Port**: `5004`
* **Lead Researcher**: IT22221728 - Udawaththa M. P. A. M.
* **Ensemble Architecture**:
  * **Data Resampling**: Synthetic Minority Over-sampling Technique (SMOTE) applied to balance rare critical-stage records.
  * **Ensemble Classifier**: Soft-Voting ensemble combining **Random Forest** (200 estimators, max depth 10) and **XGBoost** (200 estimators, learning rate 0.05).
  * **Features**: Blood Calcium ($\text{mg/dL}$), Blood Phosphorus ($\text{mg/dL}$), Body Condition Score (BCS), Parity, Days to Calving, Day-1 Milk Yield, Activity Level, and Dietary Cation-Anion Difference (DCAD).
  * **4-Tier Staging**: Categorizes progression into *Subclinical (0-24)*, *Mild (25-49)*, *Moderate (50-69)*, and *Critical (70-100)* with automated emergency first-aid protocols.

---

## 🌐 Microservices Port Matrix

| Service Identifier | Container Name | Technology | Internal Port | Host Port | Health Endpoint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Gateway** | `cattlesense-backend` | Flask 3.1 / Python 3.11 | `5001` | `5001` | `GET /health` |
| **Mastitis Service** | `cattlesense-mastitis` | TensorFlow 2.20 / Python 3.11 | `5002` | `5002` | `GET /health` |
| **LSD Service** | `cattlesense-lumpy` | Ultralytics YOLOv8 / PyTorch | `5003` | `5003` | `GET /health` |
| **Milk Fever Service** | `cattlesense-milk-fever` | XGBoost / Scikit-Learn | `5004` | `5004` | `GET /health` |
| **FMD Service** | `cattlesense-fmd` | TensorFlow 2.14 / Python 3.11 | `5005` | `5005` | `GET /health` |
| **Frontend UI (Optional)** | `cattlesense-frontend` | React 18 / Nginx | `80` | `80` | `GET /` |
| **Database** | *Hosted Neon Cloud* | PostgreSQL 16 (SSL) | `5432` | `5432` | N/A |

---

## 🛠️ Technology Stack

### Languages & Frameworks
* **Backend API Gateway**: Python 3.11, Flask 3.1, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, Requests, Psycopg v3.
* **Frontend Web Application**: React 18, Vite 8, Tailwind CSS, Axios, Lucide Icons, Chart.js, React-Hot-Toast.
* **Machine Learning & Deep Learning**: TensorFlow 2.x, Keras 3, PyTorch, Ultralytics YOLOv8, XGBoost, Scikit-Learn, Imbalanced-Learn, OpenCV (cv2), NumPy, Pandas, Pillow, ReportLab, tf-keras-vis.
* **Database & Cloud Storage**: PostgreSQL 16 on Neon Cloud, SQLAlchemy ORM, Connection Pooling (`pool_pre_ping=True`).
* **DevOps & Infrastructure**: Docker Engine 29+, Docker Compose v5, Nginx Alpine, Ubuntu Server 24.04 LTS, AWS EC2.

---

## 🚀 Deployment & Getting Started

### Prerequisites
* [Docker & Docker Compose](https://www.docker.com/) (Version 24.0+ / Compose v2)
* [Node.js](https://nodejs.org/) (v18.0+) & [Python](https://www.python.org/) (v3.11)
* Git

---

### Option A: One-Command Docker Compose Stack (Recommended)

This runs the entire distributed microservice architecture (Backend + all 4 ML services) in isolated containers with automated networking:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/chamara2002/R26-IT-045.git
   cd R26-IT-045
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.docker.example .env
   ```
   *Edit `.env` and verify your Neon `DATABASE_URL` and `JWT_SECRET_KEY`.*

3. **Launch the Microservices**:
   ```bash
   docker compose up -d
   ```

4. **Verify Container Status**:
   ```bash
   docker compose ps
   ```
   All 5 containers (`cattlesense-backend`, `cattlesense-mastitis`, `cattlesense-fmd`, `cattlesense-lumpy`, `cattlesense-milk-fever`) will report `Up (healthy)`.

5. **Access Points**:
   * Backend Gateway: `http://localhost:5001`
   * Health Check: `http://localhost:5001/health`

---

### Option B: Local Hybrid Development Mode

Ideal for developing React frontend components with instant hot-reloading:

1. **Run Backend & ML Services in Docker**:
   ```bash
   docker compose up -d
   ```

2. **Run Frontend Locally**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The React development server will start at `http://localhost:5173` with proxying to `http://localhost:5001`.*

---

### Option C: AWS EC2 Virtual Machine Deployment

To deploy the backend computation and ML engine to an **AWS EC2 Ubuntu VM**:

1. **Provision EC2 Instance**:
   * **OS**: Ubuntu Server 24.04 LTS (x86_64).
   * **Instance Type**: `t3.medium` (4 GB RAM, 2 vCPUs) or `t3.large` (8 GB RAM).
   * **Storage**: 30 GB gp3 SSD.
   * **Security Group Inbound Rules**: Allow `SSH (Port 22)` and `Custom TCP (Port 5001)`.

2. **SSH into the Instance & Install Docker**:
   ```bash
   ssh -i "cattlesense-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
   sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
   sudo usermod -aG docker $USER
   exit
   ```

3. **Deploy Code**:
   ```bash
   ssh -i "cattlesense-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
   git clone https://github.com/chamara2002/R26-IT-045.git
   cd R26-IT-045
   cp .env.docker.example .env
   # Add your Neon DATABASE_URL and JWT_SECRET_KEY in .env
   docker compose up -d
   ```

4. **Link Hosted Frontend**:
   In your hosted frontend dashboard (Vercel / Render), set:
   ```env
   VITE_API_BASE_URL=http://<YOUR-EC2-PUBLIC-IP>:5001/api
   ```

---

## 📡 REST API Specification

### Authentication Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new farmer account. |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token. |
| `GET` | `/api/auth/me` | User | Retrieve current user profile. |
| `POST` | `/api/auth/forgot-password` | Public | Dispatch password reset OTP via Resend email. |
| `POST` | `/api/auth/reset-password` | Public | Validate OTP and update account password. |

### Cattle Management Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cows` | User | Retrieve user's registered cattle inventory. |
| `POST` | `/api/cows` | User | Register a new cow record (Tag ID, Breed, Age, Lactation). |
| `GET` | `/api/cows/<cow_id>` | User | Retrieve specific cattle profile and medical history. |
| `PUT` | `/api/cows/<cow_id>` | User | Update cattle profile attributes. |
| `DELETE` | `/api/cows/<cow_id>` | User | Archive or delete a cattle record. |

### Disease Detection Endpoints (Gateway Proxied)
| Method | Endpoint | Target ML Module | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/modules/mastitis/predict` | `mastitis-service:5002` | Predict mastitis using 5 physiological biomarkers. |
| `POST` | `/api/modules/mastitis/predict-image` | `mastitis-service:5002` | Predict mastitis using uploaded udder photograph. |
| `POST` | `/api/modules/mastitis/predict-assisted`| `mastitis-service:5002` | Full multimodal inference with Grad-CAM heatmap generation. |
| `GET` | `/api/modules/mastitis/heatmap/<id>` | `mastitis-service:5002` | Download generated Grad-CAM Jet heatmap image. |
| `POST` | `/api/modules/milk-fever/predict` | `milk-fever-service:5004`| 4-Tier Milk Fever risk score & stage diagnosis. |
| `POST` | `/api/modules/fmd/predict` | `fmd-service:5005` | Foot-and-Mouth Disease image & clinical prediction. |
| `POST` | `/api/modules/lumpy/predict-assisted` | `lumpy-service:5003` | Two-stage YOLOv8s + ResNet50 LSD diagnosis. |

---

## 📊 Experimental Evaluation & Performance Metrics

| Disease Module | Primary Model | Secondary / Fusion Model | Validation Accuracy | Macro F1-Score | ROC-AUC (OvR) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mastitis Module** | ResNet50 / MobileNetV2 | Decision Tree Classifier | **94.8%** | **0.942** | **0.978** |
| **Milk Fever Module**| Random Forest (200 trees) | XGBoost Classifier (SMOTE) | **93.2%** | **0.918** | **0.993** |
| **Lumpy Skin Module**| YOLOv8s Object Detector | ResNet50 Feature Extractor | **91.5%** | **0.897** | **0.954** |
| **FMD Module** | EfficientNetB0 / CNN | Meteorological Risk Fusion | **92.4%** | **0.912** | **0.961** |

---

## 🔒 Security, Fault Tolerance & Privacy

1. **Authentication & Authorization**:
   * JSON Web Tokens (JWT) signed via HMAC-SHA256 with an enforced minimum 32-byte secret key.
   * Role-Based Access Control (RBAC) separating `farmer` and `admin` permissions.
2. **Data Encryption & Network Isolation**:
   * Cloud database communication secured via TLS/SSL (`sslmode=require`).
   * ML microservices operate in an internal bridge network (`cattlesense-net`), remaining inaccessible from the public internet.
3. **Fault Tolerance & Auto-Healing**:
   * All microservices enforce `restart: unless-stopped` with periodic `HEALTHCHECK` probes.
   * If a deep learning container encounters an Out-Of-Memory (OOM) condition, Docker automatically recovers the service without affecting the API Gateway or Frontend.

---

## 📁 Repository Structure

```
R26-IT-045/
├── docker-compose.yml              # Root Docker Compose orchestrator
├── .env.docker.example             # Environment template for Docker & AWS
├── .dockerignore                   # Docker build exclusions
├── README.md                       # Comprehensive project documentation
│
├── backend/                        # Flask API Gateway & Authentication Service
│   ├── app.py                      # Application entrypoint & CORS handler
│   ├── Dockerfile                  # Container definition for backend
│   ├── requirements.txt            # Python dependencies
│   ├── models/                     # SQLAlchemy ORM models (User, Cow, DetectionLog, etc.)
│   ├── routes/                     # Blueprint endpoints (auth, cow, module, admin, dashboard)
│   └── services/                   # Proxy service, auth logic, and email handlers
│
├── mastitis-module/                # Mastitis Detection ML Microservice
│   ├── run_api.py                  # Standalone API runner (Port 5002)
│   ├── Dockerfile                  # Container definition with OpenCV & TensorFlow
│   ├── api/flask_api.py            # REST API endpoints & Grad-CAM routes
│   ├── config/config.py            # Feature definitions & thresholds
│   ├── models/model1/              # ResNet50/MobileNetV2 weights & metadata
│   ├── models/model2/              # Decision tree model artifacts
│   └── utils/                      # Grad-CAM explainer, PDF report generator, severity engine
│
├── fmd-module/                     # Foot & Mouth Disease ML Microservice
│   ├── app.py                      # Flask entrypoint (Port 5005)
│   ├── Dockerfile                  # Container definition with TensorFlow
│   ├── src/app.py                  # FMD prediction endpoints
│   ├── src/training/               # CNN training, predict, and hybrid decision logic
│   └── weather/                    # Open-Meteo weather integration & seasonal risk engine
│
├── lumpy-module/                   # Lumpy Skin Disease ML Microservice
│   ├── app.py                      # Flask entrypoint (Port 5003)
│   ├── Dockerfile                  # Container definition with YOLOv8 & PyTorch
│   ├── config.py                   # LSD vision thresholds & weights
│   └── inference/                  # Vision pipeline, fusion coordinator, and PDF report builder
│
├── milk-fever-module/              # Milk Fever Staging ML Microservice
│   ├── app.py                      # Flask entrypoint (Port 5004)
│   ├── Dockerfile                  # Container definition with auto-training
│   ├── scripts/train_model.py      # RF + XGBoost VotingClassifier training pipeline
│   ├── data/                       # Tabular training dataset
│   └── utils/                      # Feature preprocessor and predictor
│
└── frontend/                       # React 18 Web Application (Vite + Tailwind)
    ├── package.json                # Frontend npm dependencies
    ├── vite.config.js              # Vite bundler & API proxy configuration
    ├── Dockerfile                  # Multi-stage Nginx container build
    ├── nginx.conf                  # Nginx static file & reverse proxy config
    └── src/                        # React source code (pages, components, context, i18n)
```

---

## 📜 Academic Integrity & Citation

This project is developed as part of the Final Year Research Project for the degree of Bachelor of Science (Honours) in Information Technology at the **Sri Lanka Institute of Information Technology (SLIIT)**.

**Citation**:
```bibtex
@misc{cattlesense2026,
  title={CattleSense: An Intelligent Multimodal Machine Learning Framework for Early Detection of Bovine Diseases},
  author={Perera, L. C. C. and Sudasinghe, D. D. and Manathunga, M. A. A. S. and Udawaththa, M. P. A. M.},
  year={2026},
  institution={Sri Lanka Institute of Information Technology}
}
```
