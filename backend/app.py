from datetime import date
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import get_db, init_db
from .config import settings
from .schemas import (
    AuthRequest,
    AuthResponse,
    DatasetUploadRequest,
    MetricsResponse,
    UserResponse,
)
from .services import (
    fetch_user_from_token,
    get_admin_summary,
    get_aqi_analytics,
    get_accident_analytics,
    get_dashboard_data,
    get_model_metrics,
    get_resource_analytics,
    get_water_analytics,
    insert_dataset_rows,
    load_model_artifacts,
    log_prediction,
    retrain_models,
    resolve_user_role,
    sign_in_user,
    sign_up_user,
    _predict,
    seed_default_data,
)

app = FastAPI(title="UrbanIQ API", version="1.0.0")

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


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    load_model_artifacts()
    session = next(get_db())
    seed_default_data(session)


def _require_token(authorization: str | None = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")
    return authorization.split(" ", 1)[1]


def get_current_user(token: str = Depends(_require_token)) -> dict[str, Any]:
    user_data = fetch_user_from_token(token)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return {
        "id": user_data.get("id"),
        "email": user_data.get("email"),
        "role": resolve_user_role(user_data),
        "raw": user_data,
    }


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user


@app.post("/signup", response_model=AuthResponse)
def signup(payload: AuthRequest) -> dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase not configured on this instance")
    return sign_up_user(payload.email, payload.password)


@app.post("/login", response_model=AuthResponse)
def login(payload: AuthRequest) -> dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase not configured on this instance")
    return sign_in_user(payload.email, payload.password)


@app.get("/me", response_model=UserResponse)
def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"id": user["id"], "email": user["email"], "role": user["role"]}


@app.get("/dashboard")
def dashboard(state: str = "Telangana") -> dict[str, Any]:
    return get_dashboard_data(state)


@app.get("/analytics/aqi")
def analytics_aqi(state: str = "Telangana", zone: str = "All Telangana", start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
    return get_aqi_analytics(state, zone, date.fromisoformat(start_date) if start_date else None, date.fromisoformat(end_date) if end_date else None)


@app.get("/analytics/accidents")
def analytics_accidents(state: str = "Telangana", zone: str = "All Telangana", start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
    return get_accident_analytics(state, zone, date.fromisoformat(start_date) if start_date else None, date.fromisoformat(end_date) if end_date else None)


@app.get("/analytics/water")
def analytics_water(state: str = "Telangana", zone: str = "All Telangana") -> dict[str, Any]:
    return get_water_analytics(state, zone)


@app.get("/analytics/resources")
def analytics_resources(state: str = "Telangana", zone: str = "All Telangana", start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
    return get_resource_analytics(state, zone, date.fromisoformat(start_date) if start_date else None, date.fromisoformat(end_date) if end_date else None)


@app.post("/predict/water")
def predict_water(payload: dict[str, Any], session: Session = Depends(get_db)) -> dict[str, Any]:
    prediction, confidence = _predict("water", payload)
    log_prediction(session, "water", payload, prediction, confidence)
    return {"potability": int(prediction), "confidence": round(confidence, 4)}


@app.post("/predict/aqi")
def predict_aqi(payload: dict[str, Any], session: Session = Depends(get_db)) -> dict[str, Any]:
    prediction, confidence = _predict("aqi", payload)
    log_prediction(session, "aqi", payload, prediction, confidence)
    return {"aqi_category": str(prediction), "confidence": round(confidence, 4)}


@app.post("/predict/accident")
def predict_accident(payload: dict[str, Any], session: Session = Depends(get_db)) -> dict[str, Any]:
    prediction, confidence = _predict("accident", payload)
    log_prediction(session, "accident", payload, prediction, confidence)
    return {"accident_risk": str(prediction), "confidence": round(confidence, 4)}


@app.post("/predict/resource")
def predict_resource(payload: dict[str, Any], session: Session = Depends(get_db)) -> dict[str, Any]:
    prediction, confidence = _predict("resource", payload)
    log_prediction(session, "resource", payload, prediction, confidence)
    return {"anomaly": bool(prediction), "confidence": round(confidence, 4)}


@app.post("/admin/upload")
def admin_upload(body: DatasetUploadRequest, authorization: str | None = Header(None)) -> dict[str, Any]:
    # In development when Supabase is not configured, allow uploads without auth
    if not settings.supabase_url:
        session = next(get_db())
        inserted_count = insert_dataset_rows(session, body.dataset_type, body.rows)
        return {"insertedCount": inserted_count}

    token = _require_token(authorization)
    user_data = fetch_user_from_token(token)
    if not user_data or resolve_user_role(user_data) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    session = next(get_db())
    inserted_count = insert_dataset_rows(session, body.dataset_type, body.rows)
    return {"insertedCount": inserted_count}


@app.post("/admin/retrain", response_model=MetricsResponse)
def admin_retrain(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    metrics = retrain_models()
    return {"models": metrics}


@app.get("/admin/metrics", response_model=MetricsResponse)
def admin_metrics(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"models": get_model_metrics()}


@app.get("/admin/alerts")
def admin_alerts(user: dict[str, Any] = Depends(require_admin)) -> list[dict[str, Any]]:
    return get_admin_summary()["alerts"]
