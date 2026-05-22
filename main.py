from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parent
WATER_MODEL_PATH = ROOT / "ml" / "models" / "water_potability_classifier.joblib"

app = FastAPI(title="UrbanIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

water_model: Any | None = None


class WaterPredictionInput(BaseModel):
    ph: float = Field(..., ge=0, le=14)
    hardness: float = Field(185, ge=0)
    solids: float = Field(..., ge=0)
    chloramines: float = Field(..., ge=0)
    sulfate: float = Field(310, ge=0)
    conductivity: float = Field(420, ge=0)
    turbidity: float = Field(..., ge=0)
    organic_carbon: float = Field(12.5, ge=0)
    trihalomethanes: float = Field(66, ge=0)


def load_water_model() -> Any:
    if not WATER_MODEL_PATH.exists():
        raise RuntimeError(f"Missing water model artifact: {WATER_MODEL_PATH}")
    return joblib.load(WATER_MODEL_PATH)


@app.on_event("startup")
def startup_event() -> None:
    global water_model
    water_model = load_water_model()


@app.get("/health")
@app.get("/api/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "models": {
            "water": WATER_MODEL_PATH.exists(),
        },
    }


def predict_water_payload(input_data: WaterPredictionInput) -> dict[str, Any]:
    if water_model is None:
        raise HTTPException(status_code=500, detail="Water model is not loaded.")

    frame = pd.DataFrame(
        [
            {
                "ph": input_data.ph,
                "Hardness": input_data.hardness,
                "Solids": input_data.solids,
                "Chloramines": input_data.chloramines,
                "Sulfate": input_data.sulfate,
                "Conductivity": input_data.conductivity,
                "Organic_carbon": input_data.organic_carbon,
                "Trihalomethanes": input_data.trihalomethanes,
                "Turbidity": input_data.turbidity,
            }
        ]
    )

    try:
        prediction = int(water_model.predict(frame)[0])
        probabilities = water_model.predict_proba(frame)[0]
        confidence = round(float(probabilities.max()) * 100, 1)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Water prediction failed: {exc}") from exc

    return {
        "result": "Potable" if prediction == 1 else "Not Potable",
        "potability": prediction,
        "confidence": confidence,
    }


@app.post("/water/predict")
@app.post("/api/water/predict")
def predict_water(input_data: WaterPredictionInput) -> dict[str, Any]:
    return predict_water_payload(input_data)
