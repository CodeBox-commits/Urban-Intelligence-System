from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from train_models import MODEL_DIR, ensure_model_artifacts


app = FastAPI(title="UrbanIQ ML API", version="1.0.0")

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


def load_artifacts() -> None:
    ensure_model_artifacts()

    for name, path in MODEL_FILES.items():
        if not Path(path).exists():
            raise RuntimeError(f"Missing model artifact: {path}")
        MODEL_ARTIFACTS[name] = joblib.load(path)


@app.on_event("startup")
def startup_event() -> None:
    load_artifacts()


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
