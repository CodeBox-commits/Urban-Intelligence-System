# UrbanIQ — Smart City Intelligence & Predictive Analytics Platform

UrbanIQ is a full-stack AI-powered Smart City Analytics Platform focused on Telangana, designed to monitor urban infrastructure, environmental conditions, accident risk, and resource utilization using Machine Learning, FastAPI, React, and geospatial analytics.

The platform combines:
- Real-time analytics dashboards
- ML-powered prediction systems
- Smart city monitoring
- Interactive Telangana maps
- Resource anomaly detection
- Admin dataset management
- Backend-driven analytics

---

# 🚀 Features

## 🌍 Smart City Analytics
- Air Quality Monitoring
- Water Quality Analytics
- Accident Risk Prediction
- Resource/Utility Monitoring
- Telangana-centric geospatial analytics

---

## 🤖 Machine Learning Features
- Water Potability Prediction
- AQI Classification
- Accident Risk Prediction
- Utility Anomaly Detection
- Synthetic Dataset Generation
- Model Metrics Tracking

---

## 👤 User Features
- Interactive Dashboard
- AQI Analytics
- Water Analytics
- Accident Insights
- Resource Monitoring
- Prediction Forms
- Telangana Interactive Map
- Dynamic Charts

---

## 🛠️ Admin Features
- CSV Dataset Upload
- Dataset Validation
- Prediction Logs
- Model Retraining
- Alerts Monitoring
- Model Metrics Dashboard
- Analytics Management

---

# 🧱 Tech Stack

## Frontend
- React.js
- Tailwind CSS
- React Router
- Axios
- Recharts
- Leaflet/OpenStreetMap

---

## Backend
- FastAPI
- SQLAlchemy
- Pydantic

---

## Database
- MySQL
- SQLite (Local Development Fallback)

---

## Authentication
- Supabase Authentication

---

## Machine Learning
- Scikit-learn
- XGBoost
- Pandas
- NumPy
- Joblib

---

# 🏗️ Architecture

Frontend (React)
        ↕
FastAPI Backend
        ↕
MySQL / SQLite
        ↕
ML Models (.pkl)

Supabase handles:
- login/signup
- auth sessions
- protected routes

Database handles:
- datasets
- analytics
- uploaded CSVs
- alerts
- prediction logs
- model metrics

---

# 📁 Folder Structure

```bash
urbaniq/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── routes/
│   │   ├── layouts/
│   │   ├── utils/
│   │   └── assets/
│   │
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   ├── database/
│   ├── config/
│   ├── uploads/
│   ├── utils/
│   │
│   ├── ml/
│   │   ├── datasets/
│   │   ├── preprocessing/
│   │   ├── training/
│   │   ├── inference/
│   │   └── trained_models/
│   │
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── docs/
├── README.md
└── .gitignore
```

---

# ⚙️ Local Setup Guide

# 1️⃣ Clone Repository

```bash
git clone https://github.com/CodeBox-commits/Urban-Intelligence-System.git
```

Go inside project:

```bash
cd Urban-Intelligence-System
```

Open VS Code:

```bash
code .
```

---

# 🌐 Frontend Setup

Go to frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

# Frontend Environment Variables

Create:

```bash
frontend/.env
```

Add:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

# Run Frontend

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# ⚡ Backend Setup

Open a NEW terminal.

Go backend:

```bash
cd backend
```

---

# Create Python Virtual Environment

```bash
python -m venv venv
```

Activate virtual environment:

## Windows

```bash
venv\Scripts\activate
```

## Linux/Mac

```bash
source venv/bin/activate
```

---

# Install Backend Dependencies

```bash
pip install -r requirements.txt
```

If packages are missing:

```bash
pip install fastapi uvicorn sqlalchemy pymysql pandas numpy scikit-learn xgboost python-dotenv pydantic-settings joblib
```

---

# Backend Environment Variables

Create:

```bash
backend/.env
```

Add:

```env
# Database
URBANIQ_DATABASE_URL=mysql+pymysql://root:password@localhost/urbaniq_db

# SQLite fallback
DATABASE_URL=sqlite:///./urbaniq_dev.db

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Environment
ENV=development
DEBUG=true
```

---

# 🗄️ MySQL Setup

Open MySQL.

Create database:

```sql
CREATE DATABASE urbaniq_db;
```

---

# 🚀 Run Backend

If using `main.py`

```bash
uvicorn main:app --reload
```

If using `app.py`

```bash
uvicorn app:app --reload
```

Backend runs on:

```text
http://127.0.0.1:8000
```

Swagger Docs:

```text
http://127.0.0.1:8000/docs
```

---

# 🤖 Machine Learning Setup

Go backend:

```bash
cd backend
```

Train models:

```bash
python ml/training/train_water.py
python ml/training/train_aqi.py
python ml/training/train_accident.py
python ml/training/train_resource.py
```

Models saved in:

```text
backend/ml/trained_models/
```

---

# 📊 Synthetic Dataset Generation

Generate datasets:

```bash
python ml/datasets/generate_data.py
```

Generated datasets:
- water_quality.csv
- air_quality.csv
- accident_data.csv
- resource_usage.csv

---

# 🔌 API Endpoints

# Authentication

```http
POST /auth/login
POST /auth/signup
GET  /auth/me
```

---

# Predictions

```http
POST /predict/water
POST /predict/aqi
POST /predict/accident
POST /predict/resource
```

---

# Analytics

```http
GET /analytics/dashboard
GET /analytics/water
GET /analytics/aqi
GET /analytics/accidents
GET /analytics/resources
```

---

# Admin

```http
POST /admin/upload
POST /admin/retrain
GET  /admin/datasets
GET  /admin/model-metrics
GET  /admin/logs
GET  /admin/alerts
```

---

# 👨‍💻 Admin Workflow

CSV Upload  
↓  
Schema Validation  
↓  
Preview Dataset  
↓  
Insert into Database  
↓  
Analytics Update  
↓  
Optional Model Retraining  

---

# 🗺️ Telangana Coverage

Current supported cities:
- Hyderabad
- Warangal
- Karimnagar
- Khammam
- Nizamabad
- Nalgonda
- Adilabad
- Mahbubnagar

Architecture supports future India-wide expansion.

---

# 📈 ML Model Targets

Target performance:
- Accuracy: 90–94%
- Balanced Precision/Recall/F1
- Stable predictions
- Avoid overfitting
- Realistic synthetic data

---

# ⚡ Resource Monitoring Features

- Electricity Usage Analytics
- Water Usage Analytics
- Gas Usage Analytics
- Utility Monitoring
- Anomaly Detection
- Threshold Alerts
- Resource Trend Analysis

---

# 🛠️ Troubleshooting

## Backend Import Error

If:

```text
Could not import module "main"
```

Check:
- `main.py` exists
- FastAPI app object is named `app`

Run:

```bash
uvicorn main:app --reload
```

OR

```bash
uvicorn app:app --reload
```

---

## Database Connection Issues

Check:
- MySQL running
- DB URL correct
- pymysql installed

Install:

```bash
pip install pymysql
```

---

## Supabase Auth Issues

Verify:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

IMPORTANT:
Do NOT expose service role key in frontend.

---

## Missing Python Packages

Install all:

```bash
pip install -r requirements.txt
```

---

# 🎯 Final Goal

UrbanIQ aims to become a scalable Smart City Intelligence Platform combining:
- AI analytics
- predictive ML systems
- urban monitoring
- geospatial visualization
- intelligent resource management

---
