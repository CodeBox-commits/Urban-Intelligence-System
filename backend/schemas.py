from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LoginPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=1, max_length=128)


class SessionResponse(BaseModel):
    email: str | None = None
    role: Literal["admin", "user", "guest"]
    is_authenticated: bool


class WeatherPredictionInput(BaseModel):
    city: str = Field(..., min_length=2, max_length=60)
    state: str | None = Field(default=None, max_length=60)


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
