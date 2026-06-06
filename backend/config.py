from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
BACKEND_DIR.mkdir(exist_ok=True)

DATABASE_PATH = Path(os.getenv("URBANIQ_DB_PATH", BACKEND_DIR / "urbaniq.db"))
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

DEFAULT_COUNTRY = "India"
DEFAULT_STATE = os.getenv("URBANIQ_DEFAULT_STATE", "Telangana")
DEFAULT_DAYS = 14

SESSION_SECRET = os.getenv("URBANIQ_SESSION_SECRET", "urbaniq-simple-session-secret")

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "URBANIQ_CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()
OPENWEATHER_BASE_URL = os.getenv(
    "OPENWEATHER_BASE_URL",
    "https://api.openweathermap.org/data/2.5",
).strip()

ADMIN_CREDENTIALS = {
    "admin@urbaniq.com": "team19",
    "team19@urbaniq.com": "team19",
}

STATE_OPTIONS = [
    {
        "country": DEFAULT_COUNTRY,
        "state": DEFAULT_STATE,
        "mapCenter": [17.3850, 78.4867],
        "mapZoom": 7,
    }
]

ZONE_METADATA = {
    "Hyderabad": {"coordinates": [17.3850, 78.4867], "riskLevel": "High"},
    "Warangal": {"coordinates": [17.9689, 79.5941], "riskLevel": "Medium"},
    "Karimnagar": {"coordinates": [18.4386, 79.1288], "riskLevel": "Low"},
    "Nizamabad": {"coordinates": [18.6725, 78.0941], "riskLevel": "Low"},
    "Khammam": {"coordinates": [17.2473, 80.1514], "riskLevel": "Medium"},
    "Mahbubnagar": {"coordinates": [16.7375, 78.0081], "riskLevel": "High"},
}

ZONE_ORDER = list(ZONE_METADATA.keys())

