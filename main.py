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
AQI_MODEL_PATH = ROOT / "ml" / "models" / "aqi_pm25_regressor.joblib"
ACCIDENT_MODEL_PATH = ROOT / "ml" / "models" / "accident_severity_classifier.joblib"

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
aqi_model: Any | None = None
accident_model: Any | None = None


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


class AQIPredictionInput(BaseModel):
    year: int = Field(2026, ge=2000)
    month: int = Field(5, ge=1, le=12)
    day: int = Field(22, ge=1, le=31)
    hour: int = Field(14, ge=0, le=23)
    dew_point: float = Field(12)
    temperature: float = Field(29)
    pressure: float = Field(1012, ge=850, le=1100)
    wind_direction: str = "SE"
    wind_speed: float = Field(3.2, ge=0)
    snow_hours: float = Field(0, ge=0)
    rain_hours: float = Field(0, ge=0)


class AccidentPredictionInput(BaseModel):
    weather: str = "Clear"
    visibility: float = Field(5.0, ge=0)
    road_type: str = "Urban"
    lighting: str = "Daylight"
    traffic_density: str = "Medium"
    speed_limit: int = Field(50, ge=10, le=140)
    time_of_day: str = "Afternoon"
    number_of_vehicles: int = Field(2, ge=1)
    number_of_casualties: int = Field(1, ge=0)


def load_model(path: Path, model_name: str) -> Any:
    if not path.exists():
        raise RuntimeError(f"Missing {model_name} model artifact: {path}")
    return joblib.load(path)


@app.on_event("startup")
def startup_event() -> None:
    global accident_model, aqi_model, water_model
    water_model = load_model(WATER_MODEL_PATH, "water")
    aqi_model = load_model(AQI_MODEL_PATH, "AQI")
    accident_model = load_model(ACCIDENT_MODEL_PATH, "accident")


@app.get("/health")
@app.get("/api/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "models": {
            "water": WATER_MODEL_PATH.exists(),
            "aqi": AQI_MODEL_PATH.exists(),
            "accident": ACCIDENT_MODEL_PATH.exists(),
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


def aqi_category(pm25: float) -> str:
    if pm25 <= 30:
        return "Good"
    if pm25 <= 60:
        return "Moderate"
    if pm25 <= 90:
        return "Poor"
    if pm25 <= 120:
        return "Very Poor"
    return "Severe"


def predict_aqi_payload(input_data: AQIPredictionInput) -> dict[str, Any]:
    if aqi_model is None:
        raise HTTPException(status_code=500, detail="AQI model is not loaded.")

    frame = pd.DataFrame(
        [
            {
                "year": input_data.year,
                "month": input_data.month,
                "day": input_data.day,
                "hour": input_data.hour,
                "DEWP": input_data.dew_point,
                "TEMP": input_data.temperature,
                "PRES": input_data.pressure,
                "cbwd": input_data.wind_direction,
                "Iws": input_data.wind_speed,
                "Is": input_data.snow_hours,
                "Ir": input_data.rain_hours,
            }
        ]
    )

    try:
        pm25 = max(0.0, round(float(aqi_model.predict(frame)[0]), 1))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AQI prediction failed: {exc}") from exc

    return {
        "pm25": pm25,
        "aqi_category": aqi_category(pm25),
    }


def normalize_accident_inputs(input_data: AccidentPredictionInput) -> dict[str, Any]:
    road_type_map = {"roundabout": 1, "urban": 6, "rural": 6, "highway": 3, "intersection": 6}
    weather_map = {"clear": 1, "rain": 2, "fog": 7, "storm": 5, "drizzle": 2}
    lighting_map = {"daylight": 1, "night-lit": 4, "night-unlit": 6, "dawn/dusk": 5}
    traffic_map = {"low": 1, "medium": 2, "high": 3, "very high": 4}
    time_map = {"morning": "08:00", "afternoon": "14:00", "evening": "18:00", "night": "23:00"}

    traffic_density = traffic_map.get(input_data.traffic_density.lower(), 2)
    weather = weather_map.get(input_data.weather.lower(), 1)
    lighting = lighting_map.get(input_data.lighting.lower(), 1)
    road_type = road_type_map.get(input_data.road_type.lower(), 6)

    return {
        "collision_year": 2025,
        "police_force": 1,
        "number_of_vehicles": input_data.number_of_vehicles,
        "number_of_casualties": input_data.number_of_casualties,
        "date": "2025-05-22",
        "day_of_week": 5,
        "time": time_map.get(input_data.time_of_day.lower(), "14:00"),
        "local_authority_district": 1,
        "local_authority_highway": "E09000001",
        "local_authority_highway_current": "E09000001",
        "first_road_class": 3 if road_type == 3 else 6,
        "first_road_number": 1,
        "road_type": road_type,
        "speed_limit": input_data.speed_limit,
        "junction_detail_historic": 0,
        "junction_detail": 0,
        "junction_control": 0,
        "second_road_class": -1,
        "second_road_number": 0,
        "pedestrian_crossing_human_control_historic": 0,
        "pedestrian_crossing_physical_facilities_historic": 0,
        "pedestrian_crossing": 0,
        "light_conditions": lighting,
        "weather_conditions": weather,
        "road_surface_conditions": 2 if weather in {2, 5} else 1,
        "special_conditions_at_site": 0,
        "carriageway_hazards_historic": 0,
        "carriageway_hazards": 0,
        "urban_or_rural_area": 1 if input_data.road_type.lower() == "urban" else 2,
        "did_police_officer_attend_scene_of_accident": 1 if traffic_density >= 3 else 2,
        "trunk_road_flag": 1 if input_data.road_type.lower() == "highway" else 2,
        "enhanced_severity_collision": 2,
        "collision_injury_based": 2,
        "collision_adjusted_severity_serious": 0,
        "collision_adjusted_severity_slight": 1,
    }


def predict_accident_payload(input_data: AccidentPredictionInput) -> dict[str, Any]:
    if accident_model is None:
        raise HTTPException(status_code=500, detail="Accident model is not loaded.")

    frame = pd.DataFrame([normalize_accident_inputs(input_data)])
    severity_labels = {
        "1": "High",
        "2": "Medium",
        "3": "Low",
        1: "High",
        2: "Medium",
        3: "Low",
    }

    try:
        prediction = accident_model.predict(frame)[0]
        probabilities = accident_model.predict_proba(frame)[0]
        confidence = round(float(probabilities.max()) * 100, 1)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Accident prediction failed: {exc}") from exc

    return {
        "accident_risk": severity_labels.get(prediction, str(prediction)),
        "severity_code": str(prediction),
        "confidence": confidence,
    }


@app.post("/aqi/predict")
@app.post("/api/aqi/predict")
def predict_aqi(input_data: AQIPredictionInput) -> dict[str, Any]:
    return predict_aqi_payload(input_data)


@app.post("/accident/predict")
@app.post("/api/accident/predict")
@app.post("/traffic/predict")
@app.post("/api/traffic/predict")
def predict_accident(input_data: AccidentPredictionInput) -> dict[str, Any]:
    return predict_accident_payload(input_data)
