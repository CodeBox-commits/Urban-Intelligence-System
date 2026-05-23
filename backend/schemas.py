from datetime import date, datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    user: Optional[dict[str, Any]] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str


class DatasetUploadRow(BaseModel):
    zone: str
    date: Optional[date] = None
    timestamp: Optional[datetime] = None
    state: Optional[str] = None
    aqi: Optional[int] = None
    accident_count: Optional[int] = None
    severity: Optional[str] = None
    ph: Optional[float] = None
    turbidity: Optional[float] = None
    solids: Optional[float] = None
    chloramines: Optional[float] = None
    sulfate: Optional[float] = None
    conductivity: Optional[float] = None
    organic_carbon: Optional[float] = None
    hardness: Optional[float] = None
    temperature: Optional[float] = None
    dissolved_oxygen: Optional[float] = None
    power_usage: Optional[float] = None
    water_usage: Optional[float] = None
    gas_usage: Optional[float] = None
    usage_score: Optional[float] = None
    anomaly: Optional[bool] = None


class DatasetUploadRequest(BaseModel):
    dataset_type: Literal["aqi_data", "accident_data", "water_data", "resource_data"]
    rows: List[dict[str, Any]]


class PredictionResponse(BaseModel):
    model_name: str
    prediction: Any
    confidence: float


class DashboardRequest(BaseModel):
    state: str = Field(default="Telangana")


class AnalyticsQuery(BaseModel):
    state: str = Field(default="Telangana")
    zone: str = Field(default="All Telangana")
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class RetrainResponse(BaseModel):
    model_name: str
    test_accuracy: float
    train_accuracy: float
    cv_mean_accuracy: float
    cv_std_accuracy: float
    version: str


class MetricsResponse(BaseModel):
    models: List[RetrainResponse]


class AlertResponse(BaseModel):
    zone: str
    state: str
    level: str
    message: str
    status: str
    created_at: datetime