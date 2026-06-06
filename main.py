from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from train_models import MODEL_DIR, ensure_model_artifacts, train_and_save_model


app = FastAPI(title="UrbanIQ ML API", version="1.0.0")
DB_PATH = Path(__file__).resolve().parent / "backend" / "urbaniq.db"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_FILES = {
    "water": MODEL_DIR / "water_model.pkl",
    "aqi": MODEL_DIR / "aqi_model.pkl",
    "accident": MODEL_DIR / "accident_model.pkl",
}

MODEL_ARTIFACTS: dict[str, dict] = {}
VALID_ROLES = {"admin", "user"}

MODEL_SMOKE_INPUTS = {
    "water": {
        "ph": 7.2,
        "turbidity": 3.1,
        "solids": 18000,
        "chloramines": 3.2,
        "sulfate": 310,
        "conductivity": 420,
        "organic_carbon": 11.8,
        "hardness": 185,
        "temperature": 24.4,
        "dissolved_oxygen": 7.6,
    },
    "aqi": {
        "pm25": 42,
        "pm10": 68,
        "no2": 31,
        "so2": 18,
        "co": 1.1,
        "o3": 27,
        "nh3": 22,
        "temperature": 31,
        "humidity": 56,
        "wind_speed": 3.4,
    },
    "accident": {
        "weather": "Rain",
        "visibility": 3.5,
        "road_type": "Highway",
        "lighting": "Night-unlit",
        "traffic_density": "High",
        "speed_limit": 80,
        "time_of_day": "Night",
    },
}


class WaterPredictionInput(BaseModel):
    ph: float = Field(..., ge=0, le=14)
    turbidity: float = Field(..., ge=0)
    solids: float = Field(..., ge=0)
    chloramines: float = Field(..., ge=0)
    sulfate: float = Field(..., ge=0)
    conductivity: float = Field(..., ge=0)
    organic_carbon: float = Field(..., ge=0)
    hardness: float = Field(..., ge=0)
    temperature: float = Field(..., ge=-5, le=60)
    dissolved_oxygen: float = Field(..., ge=0)


class AQIPredictionInput(BaseModel):
    pm25: float = Field(..., ge=0)
    pm10: float = Field(..., ge=0)
    no2: float = Field(..., ge=0)
    so2: float = Field(..., ge=0)
    co: float = Field(..., ge=0)
    o3: float = Field(..., ge=0)
    nh3: float = Field(..., ge=0)
    temperature: float = Field(..., ge=-10, le=60)
    humidity: float = Field(..., ge=0, le=100)
    wind_speed: float = Field(..., ge=0)


class AccidentPredictionInput(BaseModel):
    weather: str
    visibility: float = Field(..., ge=0)
    road_type: str
    lighting: str
    traffic_density: str
    speed_limit: int = Field(..., ge=10, le=140)
    time_of_day: str


class AuthInput(BaseModel):
    email: str
    password: str = Field(..., min_length=1)


def get_db_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    password_salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        100_000,
    ).hex()
    return password_salt, password_hash


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    _, password_hash = hash_password(password, salt)
    return hmac.compare_digest(password_hash, expected_hash)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def public_user(row: sqlite3.Row) -> dict:
    role = row["role"] if row["role"] in VALID_ROLES else "user"
    return {
        "id": row["id"],
        "email": row["email"],
        "role": role,
    }


def ensure_auth_tables() -> None:
    with get_db_connection() as connection:
        connection.execute(
            """
            create table if not exists users (
              id integer primary key autoincrement,
              email text not null unique,
              password_salt text not null,
              password_hash text not null,
              role text not null default 'user',
              created_at text not null default current_timestamp
            )
            """
        )


def validate_artifact(name: str, artifact: dict) -> None:
    pipeline = artifact["pipeline"]
    feature_names = artifact["feature_names"]
    payload = MODEL_SMOKE_INPUTS[name]
    input_frame = pd.DataFrame([[payload[column] for column in feature_names]], columns=feature_names)
    pipeline.predict(input_frame)
    pipeline.predict_proba(input_frame)


def load_artifacts() -> None:
    ensure_model_artifacts()

    for name, path in MODEL_FILES.items():
        if not Path(path).exists():
            raise RuntimeError(f"Missing model artifact: {path}")

        try:
            artifact = joblib.load(path)
            validate_artifact(name, artifact)
        except Exception as exc:
            print(
                f"Model artifact '{path}' could not be loaded or validated ({exc}). "
                f"Retraining '{name}' with the current Python environment..."
            )
            artifact = train_and_save_model(name)
            validate_artifact(name, artifact)

        MODEL_ARTIFACTS[name] = artifact


@app.on_event("startup")
def startup_event() -> None:
    ensure_auth_tables()
    load_artifacts()


@app.post("/auth/signup")
def signup(input_data: AuthInput) -> dict:
    email = normalize_email(input_data.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    salt, password_hash = hash_password(input_data.password)

    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                """
                insert into users (email, password_salt, password_hash, role)
                values (?, ?, ?, 'user')
                """,
                (email, salt, password_hash),
            )
            row = connection.execute(
                "select id, email, role from users where id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account already exists for this email.") from exc

    user = public_user(row)
    return {
        "session": {"user": user},
        "user": user,
    }


@app.post("/auth/login")
def login(input_data: AuthInput) -> dict:
    email = normalize_email(input_data.email)

    with get_db_connection() as connection:
        row = connection.execute(
            "select id, email, password_salt, password_hash, role from users where email = ?",
            (email,),
        ).fetchone()

    if not row or not verify_password(input_data.password, row["password_salt"], row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user = public_user(row)
    return {
        "session": {"user": user},
        "user": user,
    }


def predict_from_artifact(artifact_name: str, payload: dict) -> tuple[str | int, float]:
    artifact = MODEL_ARTIFACTS.get(artifact_name)
    if artifact is None:
        raise HTTPException(status_code=500, detail=f"Model '{artifact_name}' is not loaded.")

    pipeline = artifact["pipeline"]
    feature_names = artifact["feature_names"]
    input_frame = pd.DataFrame([[payload[column] for column in feature_names]], columns=feature_names)

    try:
        prediction = pipeline.predict(input_frame)[0]
        probabilities = pipeline.predict_proba(input_frame)[0]
        confidence = float(probabilities.max())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return prediction, confidence


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "models": list(MODEL_ARTIFACTS.keys())}


@app.post("/predict/water")
def predict_water(input_data: WaterPredictionInput) -> dict:
    prediction, confidence = predict_from_artifact("water", input_data.model_dump())
    return {
        "potability": int(prediction),
        "confidence": round(confidence, 4),
    }


@app.post("/predict/aqi")
def predict_aqi(input_data: AQIPredictionInput) -> dict:
    prediction, confidence = predict_from_artifact("aqi", input_data.model_dump())
    return {
        "aqi_category": str(prediction),
        "confidence": round(confidence, 4),
    }


@app.post("/predict/accident")
def predict_accident(input_data: AccidentPredictionInput) -> dict:
    prediction, confidence = predict_from_artifact("accident", input_data.model_dump())
    return {
        "accident_risk": str(prediction),
        "confidence": round(confidence, 4),
    }
