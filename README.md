# CattleSense - Machine Learning Based Early Detection of Cattle Diseases

🔗 Repository: https://github.com/chamara2002/R26-IT-045

**Project Progress: 50%+ Completed**

## **Group ID: R26-IT-045**

## 📋 Project Overview

### Objectives

- 🔄 Develop an intelligent system for early detection of **4 cattle diseases** (Mastitis, FMD, Lumpy Skin, Milk Fever)
- 🔄 Provide farmers with accessible, user-friendly diagnostic tools
- 🔄 Enable modular disease detection through independent, scalable ML modules
- 🔄 Support both **image-based and numerical health metrics analysis**
- 🔄 Create an **admin panel** for system management and monitoring

### Key Features (In Development)

- 🔄 **Multi-Disease Detection**: Mastitis, FMD, Lumpy Skin Disease, Milk Fever
- 🔄 **Multimodal Analysis**: Image classification + numerical health metrics fusion
- 🔄 **Modular Architecture**: 4 independent Flask services for each disease
- 🔄 **User Authentication**: JWT-based role access (Admin, Farmer)
- 🔄 **Real-time Dashboard**: Monitor herd health and disease trends
- 🔄 **Admin Panel**: User management, invitations, system settings
- 🔄 **Model Explainability**: Grad-CAM heatmaps for prediction transparency
- 🔄 **Multi-language Support**: Internationalization (i18n) for global reach
- 🔄 **PostgreSQL Database**: Secure data storage with user profiles
- 🔄 **REST API Gateway**: Single entry point for all services

---

## 👥 Team Members

| Member                          | Module            | Status         | Responsibility                                            |
| ------------------------------- | ----------------- | -------------- | --------------------------------------------------------- | ----------- |
| IT22153036 - Perera L C C       | Mastitis Module   | 🔄 In Progress | Mastitis detection, CNN/RF models, API, Grad-CAM          |
| IT22129512 - Sudasinghe D D     | FMD Module        | 🔄 In Progress | FMD detection, image classification, predictions          | Weather API |
| IT22282422 - Manathunga M A A S | Lumpy Skin Module | 🔄 In Progress | Lumpy Skin detection, model training, severity            |
| IT22221728 - Udawaththa M P A M | Milk Fever Module | 🔄 In Progress | Milk Fever detection, ML models, API, numerical analysis, |

---

## 🛠️ Technology Stack

### Backend & API

- **Python 3.8+** - Backend server language
- **Flask** - REST API framework & microservices
- **PostgreSQL 12+** - Relational database
- **JWT (PyJWT)** - Token-based authentication
- **Weather API** - Provides real-time and forecast weather data for system integration

### Frontend

- **React 18** - UI framework
- **Vite** - Build tool & development server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **React Router** - Client-side routing
- **i18n** - Internationalization support

### Machine Learning & Data Science

- **TensorFlow/Keras** - Deep learning (CNN for image classification)
- **scikit-learn** - Random Forest for numerical predictions
- **OpenCV** - Image processing & preprocessing
- **NumPy/Pandas** - Data manipulation & analysis
- **Grad-CAM** - Model interpretability & visualization

### Development & DevOps

- **Windows 10+/PowerShell** - Development environment
- **Git** - Version control
- **npm** - Node package manager
- **Python venv** - Virtual environment management
- **psycopg** - PostgreSQL adapter

---

## 🎯 Milestone: 50%+ Project Completion

### ✅ Accomplishments So Far

- ✅ Core backend API gateway structure established
- ✅ Frontend React app with Vite setup complete
- ✅ Database schema & PostgreSQL integration configured
- ✅ JWT authentication system implemented
- ✅ User models & ORM structure in place
- ✅ ML module architecture designed (4 independent services)
- ✅ All 4 ML models partially trained (Mastitis, FMD, Lumpy Skin, Milk Fever)
- ✅ API endpoint routing framework established
- ✅ Admin panel backend structure created
- ✅ Multi-language (i18n) support configured

### 🚧 In Progress (Next 50%)

- 🔄 Fine-tuning ML models for all 4 disease modules
- 🔄 Frontend component refinement & testing
- 🔄 Module-to-gateway integration & communication
- 🔄 End-to-end testing across services
- 🔄 UI/UX polish & performance optimization
- 🔄 Additional model explainability features
- 🔄 Deployment preparation & documentation

---

## 📌 Project Progress Checklist (PP1 Presentation)

### Backend & Gateway (In Progress)

- 🔄 Flask API Gateway setup - `backend/app.py`
- 🔄 Authentication module - JWT login/register
- 🔄 User & Cow models - Database ORM
- 🔄 API routes - auth, cow, dashboard, module routes
- 🔄 PostgreSQL database schema - `schema.sql`
- 🔄 Admin panel backend - User management
- 🔄 Module proxy service - Disease module communication

### Frontend Web App (In Progress)

- 🔄 React app setup with Vite
- 🔄 Authentication pages - Login/Register
- 🔄 Farmer dashboard - Herd overview
- 🔄 Disease detection interface
- 🔄 Admin dashboard - User management
- 🔄 Multi-language support (i18n)
- 🔄 Responsive UI with Tailwind CSS

### ML Modules (In Progress)

#### Member 1 - Mastitis Detection Module (In Progress)

- 🔄 Flask API service - `mastitis-module/app.py`
- 🔄 CNN model training - Image classification
- 🔄 Random Forest model - Numerical metrics
- 🔄 Multimodal fusion - Hybrid predictions
- 🔄 Grad-CAM explainability - Heatmap generation
- 🔄 Model serialization - Pre-trained models saved

#### Member 2 - FMD Detection Module (In Progress)

- 🔄 Flask API service - `fmd-module/app.py`
- 🔄 Image classification model
- 🔄 Numerical prediction model
- 🔄 API integration with gateway
- 🔄 Weather API - Provides real-time and forecast weather data for system integration

#### Member 3 - Lumpy Skin Detection Module (In Progress)

- 🔄 Flask API service - `lumpy-module/app.py`
- 🔄 Disease detection models
- 🔄 Severity assessment engine
- 🔄 API integration with gateway

#### Member 4 - Milk Fever Detection Module (In Progress)

- 🔄 Flask API service - `milk-fever-module/app.py`
- 🔄 Numerical analysis models
- 🔄 Health metric fusion
- 🔄 API integration with gateway

### Integration & Testing (In Progress)

- 🔄 API Gateway ↔ ML Modules communication
- 🔄 Frontend ↔ Backend API integration
- 🔄 Database connectivity verification
- 🔄 Authentication flow testing
- 🔄 Health check endpoints

---

## 📁 Project Structure

```
CattleSense/
├── backend/                     # Flask API Gateway (Main Service)
│   ├── app.py                   # Flask application entry
│   ├── requirements.txt         # Python dependencies
│   ├── schema.sql               # Database schema
│   ├── seed_admin.py            # Admin user initialization
│   ├── .env.example             # Environment template
│   ├── auth/                    # Authentication module
│   │   ├── validators.py
│   │   └── __init__.py
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── user.py              # User accounts
│   │   ├── cow.py               # Cattle inventory
│   │   ├── detection_log.py     # Disease detections
│   │   ├── milk_yield.py        # Production logs
│   │   ├── admin_invite.py      # Admin invitations
│   │   ├── ad.py                # Advertisement system
│   │   └── __init__.py
│   ├── routes/                  # API endpoints
│   │   ├── auth_routes.py       # Login, register, profile
│   │   ├── cow_routes.py        # Cattle CRUD operations
│   │   ├── dashboard_routes.py  # Dashboard data endpoints
│   │   ├── module_routes.py     # Disease module proxying
│   │   ├── admin_routes.py      # Admin-only endpoints
│   │   └── __init__.py
│   └── services/                # Business logic
│       ├── auth_service.py      # Auth logic
│       ├── module_proxy_service.py # Module communication
│       └── __init__.py
│
├── frontend/                    # React Web Application
│   ├── index.html               # HTML entry point
│   ├── package.json             # npm dependencies
│   ├── vite.config.js           # Vite configuration
│   ├── tailwind.config.js       # Tailwind CSS config
│   ├── postcss.config.js        # PostCSS plugins
│   ├── eslint.config.js         # Code linting rules
│   ├── src/                     # React source
│   │   ├── main.jsx             # React entry
│   │   ├── App.jsx              # Main app component
│   │   ├── App.css              # Global styles
│   │   ├── index.css
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Layout.jsx
│   │   │   ├── DashboardSidebarAds.jsx
│   │   │   ├── DetectionResultCard.jsx
│   │   │   ├── ClinicalReportGenerator.jsx
│   │   │   ├── ModuleSelector.jsx
│   │   │   ├── LanguageSwitcher.jsx
│   │   │   └── ...more components
│   │   ├── pages/               # Full page components
│   │   ├── services/            # API client functions
│   │   ├── context/             # React Context (state)
│   │   ├── i18n/                # Internationalization
│   │   ├── utils/               # Utility functions
│   │   ├── hooks/               # Custom React hooks
│   │   ├── assets/              # Images, icons
│   │   ├── data/                # Static data
│   │   └── styles/              # CSS modules
│   ├── admin/                   # Admin Dashboard (Sub-app)
│   │   ├── src/                 # Admin React app
│   │   ├── package.json
│   │   └── README.md
│   └── public/                  # Static public assets
│
├── mastitis-module/             # Mastitis Detection Service (ML)
├── fmd-module/                  # Foot & Mouth Disease Module
├── lumpy-module/                # Lumpy Skin Disease Module
├── milk-fever-module/           # Milk Fever Module
├── README.md                    # This file (for submission)
└── TEAM_INTEGRATION_GUIDE.md    # Git workflow & team collaboration guide
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8 or higher** with pip
- **Node.js 16+** with npm
- **PostgreSQL 12 or higher** (local or remote)
- **Git** for version control
- **Windows 10+** or **macOS/Linux** environment

### Step 1️⃣: Clone the Repository

```powershell
git clone <your-repository-url>
cd CattleSense
```

### Step 2️⃣: Setup PostgreSQL Database

Open PostgreSQL command line (`psql`) and run:

```sql
-- Create database
CREATE DATABASE cattlesense_db;

-- Create user
CREATE USER cattlesense_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cattlesense_db TO cattlesense_user;

-- Fix schema ownership
ALTER DATABASE cattlesense_db OWNER TO cattlesense_user;
\c cattlesense_db
ALTER SCHEMA public OWNER TO cattlesense_user;
GRANT USAGE, CREATE ON SCHEMA public TO cattlesense_user;
```

### Step 3️⃣: Setup Backend API

```powershell
cd backend

# Create Python virtual environment
python -m venv venv

# Activate venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

**Create `backend/.env` file:**

```env
POSTGRES_USER=cattlesense_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=cattlesense_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET_KEY=your-secret-key-change-in-production
FRONTEND_ORIGIN=http://localhost:5173
```

### Step 4️⃣: Setup Frontend

```powershell
cd frontend

# Install Node dependencies
npm install
```

---

## ⚙️ Running the Application

Open **3-4 PowerShell terminals** for different services:

### Terminal 1: Backend API

```powershell
# From the project root
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```

> If you are already inside the backend folder, skip the `cd backend` line and run the activation command directly.
> ✅ **Backend:** http://localhost:5001

### Terminal 2: Frontend Web App

```powershell
cd frontend
npm run dev
```

✅ **Frontend:** http://localhost:5173

### Access Points

- **Main Application:** http://localhost:5173
- **Admin Dashboard:** http://localhost:5173/admin
- **API Base:** http://localhost:5001/api

---

## 📡 API Documentation

### Core Endpoints

#### Authentication

```
POST   /api/auth/register          - Register new farmer
POST   /api/auth/login             - Login & get JWT token
GET    /api/auth/me                - Get current user profile
POST   /api/auth/logout            - Logout
```

#### Cattle Management

```
GET    /api/cows                   - List all cattle
POST   /api/cows                   - Add new cattle
GET    /api/cows/<cow_id>          - Get cattle details
PUT    /api/cows/<cow_id>          - Update cattle information
DELETE /api/cows/<cow_id>          - Delete cattle
```

#### Disease Detection

```
POST   /api/modules/mastitis/predict        - Mastitis detection
POST   /api/modules/fmd/predict             - FMD detection
POST   /api/modules/lumpy/predict           - Lumpy Skin detection
POST   /api/modules/milk-fever/predict      - Milk Fever detection
```

#### Dashboard & Reports

```
GET    /api/dashboard/overview              - Dashboard statistics
GET    /api/dashboard/recent-detections     - Detection history
```

#### Admin Functions

```
GET    /api/admin/users                     - List all users (admin only)
POST   /api/admin/invite                    - Send user invite
GET    /api/admin/settings                  - System settings
```

## 🧪 Testing & Validation

### Check System Health

```powershell
# Backend health
curl http://localhost:5001/health

# Frontend check
curl http://localhost:5173
```

### Test Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Run unit tests (if configured)
pytest tests/
```

### Test Frontend

```powershell
cd frontend

# Run component tests
npm test

# Build for production
npm run build
```

---

## 🔧 Common Issues & Solutions

### ❌ PostgreSQL Connection Error

**Error:** `could not connect to database server`

**Solution:**

- ✅ Start PostgreSQL service (Windows Services → PostgreSQL)
- ✅ Verify `.env` credentials match database setup
- ✅ Check database `cattlesense_db` exists

```powershell
# List databases
psql -U cattlesense_user -d cattlesense_db -c "\l"
```

### ❌ Permission Denied Error

**Error:** `permission denied for schema public`

**Solution:**

```sql
ALTER SCHEMA public OWNER TO cattlesense_user;
GRANT USAGE, CREATE ON SCHEMA public TO cattlesense_user;
```

### ❌ Virtual Environment Issues

**Error:** `ImportError: no pq wrapper available`

**Solution:**

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install --upgrade psycopg[binary]
```

### ❌ Port Already in Use

**Error:** `Address already in use`

**Solution (PowerShell):**

```powershell
# Find process using port 5001
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess

# Kill it
Stop-Process -Id <PID> -Force
```

### ❌ Cannot Delete Virtual Environment

**Issue:** "Files in use" when deleting `venv` folder

**Solution:**

- Close all Python/Node processes
- Close PowerShell terminals using the folder
- Delete again

---

## 🏗️ System Architecture Diagram

```
┌─────────────┐
│  Browser    │ http://localhost:5173
│  (React)    │
└──────┬──────┘
       │
       ├─────────────────────────────┐
       │                             │
   API Calls              Static Files (images, css)
       │                             │
       └──────────────┬──────────────┘
                      │
             ┌────────▼──────────┐
             │  Frontend: Vite   │
             │  (React + Tailwind)│
             └────────┬──────────┘
                      │
                      │ /api/*
                      │
         ┌────────────▼─────────────┐
         │   Backend: Flask API     │
         │  (http://localhost:5001) │
         └────────┬────────┬────────┘
                  │        │
          ┌───────┘        └───────┐
          │                        │
    ┌─────▼──────┐          ┌──────▼─────┐
    │ PostgreSQL │          │  ML Modules │
    │ Database   │          │  (Flask)    │
    └────────────┘          └─────┬───────┘
                                  │
                      ┌───────────┬───────────┬───────────┐
                      │           │           │           │
                  ┌───▼──┐   ┌───▼──┐   ┌───▼──┐   ┌───▼──────┐
                  │Mastit│   │ FMD  │   │Lumpy │   │  Milk    │
                  │  is  │   │      │   │Skin  │   │ Fever    │
                  └──────┘   └──────┘   └──────┘   └──────────┘
```

---

## 📈 Development Status

| Component         | Status         | Notes                       |
| ----------------- | -------------- | --------------------------- |
| Backend API       | 🔄 In Progress | Core APIs, auth, routing    |
| Frontend UI       | 🔄 In Progress | Dashboard, module selector  |
| Admin Panel       | 🔄 In Progress | User management operational |
| Database          | 🔄 In Progress | Schema, migrations done     |
| Authentication    | 🔄 In Progress | JWT-based auth working      |
| Mastitis Module   | 🔄 In Progress | CNN + RF hybrid model       |
| FMD Module        | 🔄 In Progress | Module communication        |
| Lumpy Module      | 🔄 In Progress | Module communication        |
| Milk Fever Module | 🔄 In Progress | Module communication        |

---
