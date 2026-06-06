# UrbanIQ

UrbanIQ is a React + Tailwind + FastAPI smart city intelligence platform for Telangana-first urban monitoring.

## Run Frontend

```bash
npm install
npm run dev
```

## Run Backend

```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Admin Login

- `admin@urbaniq.com / team19`
- `team19@urbaniq.com / team19`

Any other email/password signs in as a viewer user.
# UrbanIQ – Smart Urban Intelligence System

## Overview

UrbanIQ is a Smart City Analytics and Prediction Platform developed as a Real-Time Research Project (RRP). The system integrates Machine Learning, Data Analytics, Geographic Visualization, Weather Intelligence, and Resource Monitoring to help administrators analyze urban conditions and make informed decisions.

The platform provides real-time insights into:

* Air Quality Monitoring
* Water Quality Monitoring
* Accident Risk Analysis
* Fuel Availability Monitoring
* Weather Intelligence
* Smart Alerts
* Urban Resource Analytics

Administrators can upload datasets and instantly update analytics dashboards, while users can access predictions and city-wide insights through an intuitive interface.

---

## Team Details

### Team 19

| Name                         | Roll Number |
| ---------------------------- | ----------- |
| Udarapu Priyanka             | 24011A0533  |
| Namana Sai Veera Chiranjeevi | 24011A0535  |
| Koduru Chandrasekhar         | 24011A0537  |
| Devarakonda Sree Vyshnavi    | 24011A0538  |

---

## Project Features

### Dashboard

* Real-time KPI Cards
* Telangana Map Visualization
* AQI Analytics
* Water Quality Analytics
* Accident Analytics
* Fuel Monitoring
* Smart Alerts
* Weather Information

### Machine Learning Predictions

#### Air Quality Prediction

Predict air quality conditions using environmental parameters.

#### Water Quality Prediction

Predict water potability using water quality metrics.

#### Accident Risk Prediction

Predict accident risk based on traffic and environmental conditions.

### Admin Panel

* Dataset Upload
* Upload History
* Analytics Refresh
* Data Management

### Fuel Monitoring

* Fuel Availability Tracking
* Regional Fuel Statistics
* Fuel Trend Analysis

### Weather Intelligence

* OpenWeather API Integration
* Temperature Monitoring
* Humidity Monitoring
* Wind Speed Monitoring
* Smart Weather Alerts

---

## Technology Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* Recharts
* React Router
* Leaflet

### Backend

* FastAPI
* Python

### Database

* SQLite (Development)
* Supabase/PostgreSQL (Optional)

### Machine Learning

* Scikit-Learn
* XGBoost
* Pandas
* NumPy
* Joblib

---

## Project Structure

```text
UrbanIQ/
│
├── backend/
│   ├── services/
│   ├── config.py
│   ├── database.py
│   ├── init_db.py
│   ├── schemas.py
│   └── main.py
│
├── data/
│
├── ml/
│
├── models/
│
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── train_models.py
├── generate_data.py
├── main.py
├── requirements.txt
├── package.json
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/CodeBox-commits/Urban-Intelligence-System.git

cd Urban-Intelligence-System
```

---

## Frontend Setup

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Build for production:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

---

## Backend Setup

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Run backend:

```bash
python -m uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

API Documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Environment Variables

Create a `.env` file.

Example:

```env
OPENWEATHER_API_KEY=YOUR_API_KEY
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

DATABASE_URL=sqlite:///./urbaniq.db

SESSION_SECRET=your_secret_key
```

---

## Admin Credentials

### Admin Login

```text
Email: admin@team19.com
Password: team19
```

Alternative:

```text
Email: team19@urbaniq.com
Password: team19
```

### User Login

Users only need to enter their name to access the dashboard.

No registration is required.

---

## API Endpoints

### Health

```http
GET /health
```

### Dashboard

```http
GET /api/dashboard
```

### Weather

```http
GET /api/weather
```

### Analytics

```http
GET /api/analytics/aqi
GET /api/analytics/water
GET /api/analytics/accidents
GET /api/analytics/fuel
```

### Predictions

```http
POST /predict/aqi
POST /predict/water
POST /predict/accident
```

### Admin

```http
GET /api/admin/upload-history

POST /api/admin/upload/{dataset}
```

---

## Machine Learning Models

UrbanIQ utilizes trained machine learning models for:

* Air Quality Prediction
* Water Quality Prediction
* Accident Risk Prediction

Model artifacts are automatically loaded during backend startup.

If model files are unavailable, the system can regenerate them using:

```bash
python train_models.py
```

---

## Deployment

### Frontend

Compatible with:

* Vercel
* Netlify

### Backend

Compatible with:

* Render
* Railway
* VPS/Linux Server

---

## Future Enhancements

* Live Government Data Integration
* IoT Sensor Integration
* Predictive Resource Allocation
* Mobile Application
* Advanced Smart City Analytics

---

## License

This project was developed as part of the Real-Time Research Project (RRP) for academic and educational purposes.

---

## Acknowledgement

We express our sincere gratitude to **JNTUH University College of Engineering Science and Technology, Hyderabad**, and the **Department of Computer Science and Engineering** for providing us with the opportunity and academic support to undertake this project.

We extend our heartfelt thanks to **Ms. D. Kalpana, Assistant Professor, Department of Computer Science and Engineering, JNTUH UCESTH**, for her valuable guidance, encouragement, and continuous support throughout the development of this project.

Her mentorship played a significant role in the successful completion of UrbanIQ.
