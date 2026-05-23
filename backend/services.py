from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Iterable
import logging

import httpx
import joblib
import numpy as np
from sqlalchemy.orm import Session

from .config import settings
from .ml.training import train_models
from .ml.inference import loader as model_loader
from .db import get_db

logger = logging.getLogger(__name__)
from .models import (
    AccidentData,
    Alert,
    AirQualityData,
    ModelMetrics,
    PredictionLog,
    ResourceUsageData,
    UploadedDataset,
    User,
    WaterQualityData,
)

MODEL_FILES = {
    "water": settings.model_dir / "water_model.pkl",
    "aqi": settings.model_dir / "aqi_model.pkl",
    "accident": settings.model_dir / "accident_model.pkl",
    "resource": settings.model_dir / "resource_model.pkl",
}

MODEL_ARTIFACTS: dict[str, dict[str, Any]] = {}

SUPERBASE_AUTH_BASE = f"{settings.supabase_url}/auth/v1" if settings.supabase_url else None

SEQ_ZONES = [
    {"zone": "Hyderabad", "district": "Hyderabad", "city": "Hyderabad", "latitude": 17.385, "longitude": 78.4867, "base_aqi": 84, "base_risk": 76, "base_alerts": 6},
    {"zone": "Warangal", "district": "Warangal", "city": "Warangal", "latitude": 17.9689, "longitude": 79.5941, "base_aqi": 72, "base_risk": 48, "base_alerts": 4},
    {"zone": "Karimnagar", "district": "Karimnagar", "city": "Karimnagar", "latitude": 18.4386, "longitude": 79.1288, "base_aqi": 58, "base_risk": 26, "base_alerts": 2},
    {"zone": "Nizamabad", "district": "Nizamabad", "city": "Nizamabad", "latitude": 18.6725, "longitude": 78.0941, "base_aqi": 62, "base_risk": 31, "base_alerts": 3},
    {"zone": "Khammam", "district": "Khammam", "city": "Khammam", "latitude": 17.2473, "longitude": 80.1514, "base_aqi": 70, "base_risk": 52, "base_alerts": 5},
    {"zone": "Mahbubnagar", "district": "Mahbubnagar", "city": "Mahbubnagar", "latitude": 16.7375, "longitude": 78.0081, "base_aqi": 79, "base_risk": 69, "base_alerts": 7},
]


def _supabase_headers(token: str | None = None) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.supabase_anon_key:
        headers["apikey"] = settings.supabase_anon_key
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def sign_up_user(email: str, password: str) -> dict[str, Any]:
    with httpx.Client(base_url=SUPERBASE_AUTH_BASE, timeout=30.0) as client:
        response = client.post(
            "/signup",
            json={"email": email, "password": password, "options": {"data": {"role": "user"}}},
            headers=_supabase_headers(),
        )
    response.raise_for_status()
    return response.json()


def sign_in_user(email: str, password: str) -> dict[str, Any]:
    with httpx.Client(base_url=SUPERBASE_AUTH_BASE, timeout=30.0) as client:
        response = client.post(
            "/token?grant_type=password",
            json={"email": email, "password": password},
            headers=_supabase_headers(),
        )
    response.raise_for_status()
    return response.json()


def fetch_user_from_token(token: str) -> dict[str, Any] | None:
    with httpx.Client(base_url=SUPERBASE_AUTH_BASE, timeout=30.0) as client:
        response = client.get("/user", headers=_supabase_headers(token))
    if response.status_code != 200:
        return None
    return response.json()


def resolve_user_role(user_data: dict[str, Any] | None) -> str:
    if not user_data:
        return "guest"

    email = user_data.get("email", "")
    if email and email.lower() in [value.lower() for value in settings.admin_emails]:
        return "admin"

    role = user_data.get("user_metadata", {}).get("role") or user_data.get("app_metadata", {}).get("role")
    if role in {"admin", "user", "guest"}:
        return role

    return "user"


def load_model_artifacts() -> None:
    # Ensure artifacts exist and are trained
    train_models.ensure_model_artifacts()
    # Defer loading to inference loader; pre-warm artifacts
    for model_name in MODEL_FILES.keys():
        try:
            artifact = model_loader.load_model(model_name)
            MODEL_ARTIFACTS[model_name] = artifact
            logger.info("Loaded model artifact: %s", model_name)
        except Exception as exc:
            MODEL_ARTIFACTS[model_name] = None
            logger.exception("Failed to load model artifact %s: %s", model_name, exc)


def _predict(model_name: str, payload: dict[str, Any]) -> tuple[Any, float]:
    artifact = MODEL_ARTIFACTS.get(model_name)
    if artifact is None:
        logger.info("Model artifact missing for %s, attempting on-demand load", model_name)
        try:
            artifact = model_loader.load_model(model_name)
            MODEL_ARTIFACTS[model_name] = artifact
        except Exception as exc:
            logger.exception("On-demand load failed for %s", model_name)
            raise RuntimeError(f"Model '{model_name}' not loaded: {exc}") from exc

    pipeline = artifact["pipeline"]
    feature_names = artifact["feature_names"]
    input_frame = train_models.pd.DataFrame([[payload.get(key) for key in feature_names]], columns=feature_names)
    prediction = pipeline.predict(input_frame)[0]
    probabilities = pipeline.predict_proba(input_frame)[0]
    return prediction, float(np.max(probabilities))


def _to_json_safe(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_json_safe(v) for v in value]
    return value


def log_prediction(session: Session, model_name: str, input_data: dict[str, Any], prediction: Any, confidence: float) -> None:
    safe_input = _to_json_safe(input_data)
    safe_prediction = _to_json_safe({"result": prediction})
    session.add(
        PredictionLog(
            model_name=model_name,
            input_data=safe_input,
            prediction=safe_prediction,
            confidence=confidence,
        )
    )
    session.commit()


def _to_date(value: str | date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(value)


def _to_datetime(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


def _aqi_category(aqi: int) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    return "Very Unhealthy"


def _risk_level(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _normalize_aqi_row(row: dict[str, Any]) -> dict[str, Any]:
    aqi = int(float(row.get("aqi", 0)))
    return {
        "state": row.get("state", "Telangana"),
        "zone": row["zone"],
        "timestamp": _to_datetime(row.get("timestamp") or row.get("date") or datetime.utcnow().isoformat()),
        "pm25": float(row.get("pm25", max(8, aqi * 0.45))),
        "pm10": float(row.get("pm10", max(18, aqi * 0.8))),
        "no2": float(row.get("no2", max(6, aqi * 0.18))),
        "so2": float(row.get("so2", max(2, aqi * 0.12))),
        "co": float(row.get("co", max(0.3, aqi * 0.02))),
        "o3": float(row.get("o3", max(5, aqi * 0.21))),
        "nh3": float(row.get("nh3", max(2, aqi * 0.12))),
        "temperature": float(row.get("temperature", 28.0)),
        "humidity": float(row.get("humidity", 56.0)),
        "wind_speed": float(row.get("wind_speed", 3.5)),
        "aqi": aqi,
        "aqi_category": row.get("aqi_category") or _aqi_category(aqi),
    }


def _normalize_accident_row(row: dict[str, Any]) -> dict[str, Any]:
    count = int(float(row.get("accident_count", 0)))
    return {
        "state": row.get("state", "Telangana"),
        "zone": row["zone"],
        "date": _to_date(row.get("date") or datetime.utcnow().date().isoformat()),
        "accident_count": count,
        "severity": row.get("severity") or ("High" if count >= 7 else "Medium" if count >= 4 else "Low"),
        "risk_level": row.get("risk_level") or _risk_level(count * 10),
    }


def _normalize_water_row(row: dict[str, Any]) -> dict[str, Any]:
    potability = int(float(row.get("potability", 0)))
    return {
        "state": row.get("state", "Telangana"),
        "zone": row["zone"],
        "timestamp": _to_datetime(row.get("timestamp") or datetime.utcnow().isoformat()),
        "ph": float(row.get("ph", 7.0)),
        "turbidity": float(row.get("turbidity", 3.0)),
        "solids": float(row.get("solids", 17000)),
        "chloramines": float(row.get("chloramines", 3.5)),
        "sulfate": float(row.get("sulfate", 260.0)),
        "conductivity": float(row.get("conductivity", 410.0)),
        "organic_carbon": float(row.get("organic_carbon", 12.0)),
        "hardness": float(row.get("hardness", 180.0)),
        "temperature": float(row.get("temperature", 25.0)),
        "dissolved_oxygen": float(row.get("dissolved_oxygen", 7.5)),
        "potability": potability,
        "risk_level": row.get("risk_level") or ("Safe" if potability == 1 else "Review"),
    }


def _normalize_resource_row(row: dict[str, Any]) -> dict[str, Any]:
    anomaly = _parse_bool(row.get("anomaly", False))
    usage_score = float(row.get("usage_score", 0.0))
    if usage_score == 0.0:
        usage_score = float(row.get("power_usage", 0)) * 0.18 + float(row.get("water_usage", 0)) * 0.14 + float(row.get("gas_usage", 0)) * 0.22

    return {
        "state": row.get("state", "Telangana"),
        "zone": row["zone"],
        "timestamp": _to_datetime(row.get("timestamp") or row.get("date") or datetime.utcnow().isoformat()),
        "power_usage": float(row.get("power_usage", 120.0)),
        "water_usage": float(row.get("water_usage", 55.0)),
        "gas_usage": float(row.get("gas_usage", 28.0)),
        "usage_score": usage_score,
        "anomaly": anomaly,
        "risk_level": row.get("risk_level") or ("High" if anomaly else "Normal"),
    }


def insert_dataset_rows(session: Session, dataset_type: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0

    model_map = {
        "aqi_data": (AirQualityData, _normalize_aqi_row),
        "accident_data": (AccidentData, _normalize_accident_row),
        "water_data": (WaterQualityData, _normalize_water_row),
        "resource_data": (ResourceUsageData, _normalize_resource_row),
    }

    if dataset_type not in model_map:
        raise ValueError("Invalid dataset type")

    model_class, normalizer = model_map[dataset_type]
    objects = []
    for row in rows:
        normalized = normalizer(row)
        objects.append(model_class(**normalized))

    session.add_all(objects)
    session.commit()
    session.add(
        UploadedDataset(
            dataset_type=dataset_type,
            record_count=len(objects),
            status="Processed",
            details={"zones": list({row.get("zone") for row in rows})},
        )
    )
    session.commit()
    return len(objects)


def _series_dates(days: int = 14) -> list[datetime]:
    return [datetime.utcnow() - timedelta(days=index) for index in range(days)][::-1]


def _generate_pollutants(aqi: int) -> dict[str, float]:
    return {
        "pm25": max(8.0, aqi * 0.44 + np.random.normal(0, 3.5)),
        "pm10": max(18.0, aqi * 0.77 + np.random.normal(0, 5.0)),
        "no2": max(6.0, aqi * 0.18 + np.random.normal(0, 2.0)),
        "so2": max(2.0, aqi * 0.12 + np.random.normal(0, 1.2)),
        "co": max(0.2, aqi * 0.02 + np.random.normal(0, 0.2)),
        "o3": max(5.0, aqi * 0.21 + np.random.normal(0, 3.0)),
        "nh3": max(2.0, aqi * 0.11 + np.random.normal(0, 1.4)),
    }


def _seed_zone_timeseries(session: Session) -> None:
    if session.query(AirQualityData).count() > 0:
        return

    for zone in SEQ_ZONES:
        for timestamp in _series_dates(14):
            aqi = int(np.clip(zone["base_aqi"] + np.random.normal(0, 5), 30, 210))
            pollutants = _generate_pollutants(aqi)
            session.add(
                AirQualityData(
                    state="Telangana",
                    zone=zone["zone"],
                    district=zone["district"],
                    city=zone["city"],
                    latitude=zone["latitude"],
                    longitude=zone["longitude"],
                    timestamp=timestamp,
                    aqi=aqi,
                    aqi_category=_aqi_category(aqi),
                    **pollutants,
                    temperature=float(np.clip(28 + np.random.normal(0, 4), 16, 42)),
                    humidity=float(np.clip(58 + np.random.normal(0, 8), 18, 96)),
                    wind_speed=float(np.clip(3.5 + np.random.normal(0, 1.8), 0.3, 12)),
                )
            )

    for zone in SEQ_ZONES:
        for timestamp in _series_dates(14):
            incidents = int(np.clip(zone["base_alerts"] + np.random.normal(0, 2), 0, 12))
            session.add(
                AccidentData(
                    state="Telangana",
                    zone=zone["zone"],
                    district=zone["district"],
                    city=zone["city"],
                    date=timestamp.date(),
                    accident_count=incidents,
                    severity="High" if incidents >= 8 else "Medium" if incidents >= 4 else "Low",
                    risk_level=_risk_level(incidents * 10),
                )
            )

    for zone in SEQ_ZONES:
        for _ in range(10):
            quality = np.clip(np.random.normal(0.7, 0.22), 0.0, 1.0)
            potability = int(quality > 0.6)
            session.add(
                WaterQualityData(
                    state="Telangana",
                    zone=zone["zone"],
                    district=zone["district"],
                    city=zone["city"],
                    timestamp=datetime.utcnow() - timedelta(days=int(np.random.poisson(5))),
                    ph=float(np.clip(np.random.normal(7.2, 0.8), 5.0, 9.5)),
                    turbidity=float(np.clip(np.random.normal(3.5, 1.5), 0.2, 11.2)),
                    solids=float(np.clip(np.random.normal(17000, 5200), 1800, 32000)),
                    chloramines=float(np.clip(np.random.normal(3.8, 1.3), 0.6, 10.0)),
                    sulfate=float(np.clip(np.random.normal(260, 88), 80, 450)),
                    conductivity=float(np.clip(np.random.normal(410, 110), 120, 700)),
                    organic_carbon=float(np.clip(np.random.normal(11.6, 3.0), 1.5, 25.0)),
                    hardness=float(np.clip(np.random.normal(180, 42), 50, 320)),
                    temperature=float(np.clip(np.random.normal(24.0, 4.2), 6.0, 38.0)),
                    dissolved_oxygen=float(np.clip(np.random.normal(7.8, 1.2), 3.0, 13.0)),
                    potability=potability,
                    risk_level="Safe" if potability else "Review",
                )
            )

    for zone in SEQ_ZONES:
        for timestamp in _series_dates(14):
            power_usage = float(np.clip(np.random.normal(125, 18), 70, 220))
            water_usage = float(np.clip(np.random.normal(52, 9), 20, 95))
            gas_usage = float(np.clip(np.random.normal(28, 6), 12, 56))
            usage_score = round(power_usage * 0.18 + water_usage * 0.15 + gas_usage * 0.22, 1)
            anomaly = usage_score > 55
            session.add(
                ResourceUsageData(
                    state="Telangana",
                    zone=zone["zone"],
                    district=zone["district"],
                    city=zone["city"],
                    latitude=zone["latitude"],
                    longitude=zone["longitude"],
                    timestamp=timestamp,
                    power_usage=power_usage,
                    water_usage=water_usage,
                    gas_usage=gas_usage,
                    usage_score=usage_score,
                    anomaly=anomaly,
                    risk_level="High" if anomaly else "Normal",
                )
            )

    if session.query(Alert).count() == 0:
        for zone in SEQ_ZONES:
            session.add(
                Alert(
                    zone=zone["zone"],
                    state="Telangana",
                    level="High" if zone["base_alerts"] >= 6 else "Medium",
                    message=f"Monitoring required for {zone['zone']} based on recent analytics.",
                    status="Open",
                )
            )

    session.commit()


def seed_default_data(session: Session) -> None:
    _seed_zone_timeseries(session)


def _list_latest_by_zone(rows: Iterable[Any], key_attr: str, fallback_value: Any = None) -> dict[str, Any]:
    latest = {}
    for row in rows:
        zone = getattr(row, key_attr)
        if zone not in latest or getattr(row, "timestamp", None) > getattr(latest[zone], "timestamp", None):
            latest[zone] = row
    return latest


def get_dashboard_data(state: str = "Telangana") -> dict[str, Any]:
    session = next(get_db())
    air_rows = session.query(AirQualityData).filter(AirQualityData.state == state).order_by(AirQualityData.timestamp.desc()).all()
    water_rows = session.query(WaterQualityData).filter(WaterQualityData.state == state).order_by(WaterQualityData.timestamp.desc()).all()
    accident_rows = session.query(AccidentData).filter(AccidentData.state == state).order_by(AccidentData.date.desc()).all()
    resource_rows = session.query(ResourceUsageData).filter(ResourceUsageData.state == state).order_by(ResourceUsageData.timestamp.desc()).all()

    if not air_rows or not water_rows or not accident_rows:
        return {
            "country": "India",
            "state": state,
            "mapCenter": [17.385, 78.4867],
            "mapZoom": 7,
            "zones": [],
            "zoneOptions": [f"All {state}"],
            "kpis": [],
            "aqiTrend": [],
            "accidentByZone": [],
            "waterQualityByZone": [],
            "alerts": [],
        }

    latest_air = _list_latest_by_zone(air_rows, "zone")
    latest_water = _list_latest_by_zone(water_rows, "zone")
    latest_accident = {row.zone: row for row in accident_rows[: len(SEQ_ZONES) * 2]}
    latest_resource = _list_latest_by_zone(resource_rows, "zone")

    zones = []
    for zone_meta in SEQ_ZONES:
        zone_name = zone_meta["zone"]
        air = latest_air.get(zone_name)
        water = latest_water.get(zone_name)
        accident = latest_accident.get(zone_name)
        resource = latest_resource.get(zone_name)
        if not air or not water or not accident:
            continue
        risk_score = int(np.clip(air.aqi * 0.6 + accident.accident_count * 4 + (resource.usage_score if resource else 0) * 0.4, 0, 100))
        zone_risk = _risk_level(risk_score)
        zones.append(
            {
                "country": "India",
                "state": state,
                "zone": zone_name,
                "coordinates": [zone_meta["latitude"], zone_meta["longitude"]],
                "riskLevel": zone_risk,
                "markerColor": "red" if zone_risk == "High" else "orange" if zone_risk == "Medium" else "green",
                "aqi": air.aqi,
                "water_quality": "Potable" if water.potability == 1 else "Needs Review",
                "water_score": int(np.clip(100 - abs(7.2 - water.ph) * 8 - water.turbidity * 4, 20, 96)),
                "risk_score": risk_score,
                "alerts": zone_meta["base_alerts"],
                "aqiTrend": [
                    int(np.clip(air.aqi + np.random.normal(0, 3), 30, 210)) for _ in range(7)
                ],
            }
        )

    if not zones:
        return {
            "country": "India",
            "state": state,
            "mapCenter": [17.385, 78.4867],
            "mapZoom": 7,
            "zones": [],
            "zoneOptions": [f"All {state}"],
            "kpis": [],
            "aqiTrend": [],
            "accidentByZone": [],
            "waterQualityByZone": [],
            "alerts": [],
        }

    potable_zones = [zone for zone in zones if zone["water_quality"] == "Potable"]
    kpis = [
        {"label": "AQI Level", "value": str(int(np.mean([zone["aqi"] for zone in zones]))), "helper": f"Average across {len(zones)} {state} zones", "tone": "amber"},
        {"label": "Water Quality", "value": f"{int(np.round(len(potable_zones) / len(zones) * 100))}%", "helper": f"{len(potable_zones)}/{len(zones)} zones potable", "tone": "emerald"},
        {"label": "Accident Risk", "value": f"{int(np.round(np.mean([zone["risk_score"] for zone in zones])))}%", "helper": "Average zone risk score", "tone": "orange"},
        {"label": "Alerts", "value": str(sum(zone["alerts"] for zone in zones)), "helper": f"Active alerts across {state}", "tone": "rose"},
    ]

    aqi_trend = [
        {"day": day, **{zone["zone"]: zone["aqiTrend"][index] for zone in zones}}
        for index, day in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    ]

    return {
        "country": "India",
        "state": state,
        "mapCenter": [17.385, 78.4867],
        "mapZoom": 7,
        "zones": zones,
        "zoneOptions": [f"All {state}"] + [zone["zone"] for zone in zones],
        "kpis": kpis,
        "aqiTrend": aqi_trend,
        "accidentByZone": [{"zone": zone["zone"], "risk_score": zone["risk_score"], "riskLevel": zone["riskLevel"]} for zone in zones],
        "waterQualityByZone": [{"zone": zone["zone"], "water_score": zone["water_score"], "water_quality": zone["water_quality"]} for zone in zones],
        "alerts": [
            {
                "id": index + 1,
                "country": "India",
                "state": state,
                "zone": zone["zone"],
                "type": "High Risk Zone" if zone["riskLevel"] == "High" else "Water Review" if zone["water_quality"] == "Needs Review" else "Routine Check",
                "status": "Action Needed" if zone["riskLevel"] == "High" else "Monitoring",
                "time": f"{10 + index}:30 AM",
            }
            for index, zone in enumerate(zones)
        ],
    }


def _map_trend(rows: Iterable[Any], value_key: str) -> list[dict[str, Any]]:
    results: dict[str, float] = {}
    for row in rows:
        day = row.date.isoformat() if hasattr(row, "date") else row.timestamp.date().isoformat()
        results.setdefault(day, 0)
        results[day] += float(getattr(row, value_key, 0))
    return [{"date": day, "value": value} for day, value in sorted(results.items())]


def _latest_row(rows: Iterable[Any]) -> Any | None:
    sorted_rows = sorted(rows, key=lambda row: getattr(row, "timestamp", getattr(row, "date", datetime.min)), reverse=True)
    return sorted_rows[0] if sorted_rows else None


def _build_zone_options(state: str) -> list[str]:
    return [f"All {state}"] + [zone["zone"] for zone in SEQ_ZONES]


def get_aqi_analytics(state: str, zone: str, start_date: date | None, end_date: date | None) -> dict[str, Any]:
    session = next(get_db())
    query = session.query(AirQualityData).filter(AirQualityData.state == state)
    if zone and not zone.startswith("All "):
        query = query.filter(AirQualityData.zone == zone)
    if start_date:
        query = query.filter(AirQualityData.timestamp >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(AirQualityData.timestamp <= datetime.combine(end_date, datetime.max.time()))
    rows = query.order_by(AirQualityData.timestamp.asc()).all()
    latest = _latest_row(rows)
    current_aqi = latest.aqi if latest else None
    return {
        "zoneOptions": _build_zone_options(state),
        "currentAqi": current_aqi,
        "category": _aqi_category(current_aqi) if current_aqi is not None else "No Data",
        "pollutants": [
            {"name": "PM2.5", "value": round(latest.pm25, 1) if latest else 0},
            {"name": "PM10", "value": round(latest.pm10, 1) if latest else 0},
            {"name": "NO2", "value": round(latest.no2, 1) if latest else 0},
            {"name": "SO2", "value": round(latest.so2, 1) if latest else 0},
            {"name": "CO", "value": round(latest.co, 1) if latest else 0},
            {"name": "O3", "value": round(latest.o3, 1) if latest else 0},
        ],
        "trend": _map_trend(rows, "aqi"),
        "latestDate": latest.timestamp.date().isoformat() if latest else None,
    }


def get_accident_analytics(state: str, zone: str, start_date: date | None, end_date: date | None) -> dict[str, Any]:
    session = next(get_db())
    query = session.query(AccidentData).filter(AccidentData.state == state)
    if zone and not zone.startswith("All "):
        query = query.filter(AccidentData.zone == zone)
    if start_date:
        query = query.filter(AccidentData.date >= start_date)
    if end_date:
        query = query.filter(AccidentData.date <= end_date)
    rows = query.order_by(AccidentData.date.asc()).all()
    totals = {}
    for row in rows:
        totals[row.zone] = totals.get(row.zone, 0) + row.accident_count
    trend = _map_trend(rows, "accident_count")
    total_incidents = sum(totals.values())
    risk_score = int(min(100, (total_incidents / (len(rows) or 1)) * 6))
    return {
        "zoneOptions": _build_zone_options(state),
        "totalIncidents": total_incidents,
        "riskScore": risk_score,
        "riskLevel": _risk_level(risk_score),
        "trend": trend,
        "zoneTotals": [{"zone": key, "incidents": value} for key, value in totals.items()],
    }


def get_water_analytics(state: str, zone: str) -> dict[str, Any]:
    session = next(get_db())
    query = session.query(WaterQualityData).filter(WaterQualityData.state == state)
    if zone and not zone.startswith("All "):
        query = query.filter(WaterQualityData.zone == zone)
    rows = query.order_by(WaterQualityData.timestamp.asc()).all()
    latest = _latest_row(rows)
    return {
        "zoneOptions": _build_zone_options(state),
        "latestSample": {
            "zone": latest.zone if latest else None,
            "potability": latest.potability if latest else None,
            "water_score": int(np.clip(100 - abs(7.2 - latest.ph) * 8 - latest.turbidity * 4, 0, 100)) if latest else 0,
            "quality": "Potable" if latest and latest.potability == 1 else "Needs Review",
        },
        "trend": _map_trend(rows, "potability"),
    }


def get_resource_analytics(state: str, zone: str, start_date: date | None, end_date: date | None) -> dict[str, Any]:
    session = next(get_db())
    query = session.query(ResourceUsageData).filter(ResourceUsageData.state == state)
    if zone and not zone.startswith("All "):
        query = query.filter(ResourceUsageData.zone == zone)
    if start_date:
        query = query.filter(ResourceUsageData.timestamp >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(ResourceUsageData.timestamp <= datetime.combine(end_date, datetime.max.time()))
    rows = query.order_by(ResourceUsageData.timestamp.asc()).all()
    latest = _latest_row(rows)
    anomaly_count = sum(1 for row in rows if row.anomaly)
    return {
        "zoneOptions": _build_zone_options(state),
        "averageUsage": {
            "power": round(np.mean([row.power_usage for row in rows]) if rows else 0, 1),
            "water": round(np.mean([row.water_usage for row in rows]) if rows else 0, 1),
            "gas": round(np.mean([row.gas_usage for row in rows]) if rows else 0, 1),
        },
        "anomalyCount": anomaly_count,
        "trend": _map_trend(rows, "usage_score"),
        "latestUsage": {
            "zone": latest.zone if latest else None,
            "usage_score": latest.usage_score if latest else None,
            "risk_level": latest.risk_level if latest else None,
            "anomaly": latest.anomaly if latest else None,
        },
    }


def get_model_metrics() -> list[dict[str, Any]]:
    session = next(get_db())
    query = session.query(ModelMetrics).order_by(ModelMetrics.trained_at.desc()).all()
    results: dict[str, dict[str, Any]] = {}
    for row in query:
        if row.model_name not in results:
            results[row.model_name] = {
                "model_name": row.model_name,
                "version": row.version,
                "train_accuracy": row.train_accuracy,
                "test_accuracy": row.test_accuracy,
                "cv_mean_accuracy": row.cv_mean_accuracy,
                "cv_std_accuracy": row.cv_std_accuracy,
                "trained_at": row.trained_at.isoformat(),
            }
    return list(results.values())


def get_alert_feed(limit: int = 12) -> list[dict[str, Any]]:
    session = next(get_db())
    rows = session.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
    return [
        {
            "zone": row.zone,
            "state": row.state,
            "level": row.level,
            "message": row.message,
            "status": row.status,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


def retrain_models() -> list[dict[str, Any]]:
    session = next(get_db())
    artifacts = []
    for dataset_name in train_models.DATASETS:
        artifact = train_models.train_and_save_model(dataset_name)
        metrics = artifact["metrics"]
        version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        session.add(
            ModelMetrics(
                model_name=dataset_name,
                version=version,
                train_accuracy=metrics["train_accuracy"],
                test_accuracy=metrics["test_accuracy"],
                cv_mean_accuracy=metrics["cv_mean_accuracy"],
                cv_std_accuracy=metrics["cv_std_accuracy"],
                model_params=artifact.get("model_params", {}),
            )
        )
        artifacts.append(
            {
                "model_name": dataset_name,
                "version": version,
                "train_accuracy": metrics["train_accuracy"],
                "test_accuracy": metrics["test_accuracy"],
                "cv_mean_accuracy": metrics["cv_mean_accuracy"],
                "cv_std_accuracy": metrics["cv_std_accuracy"],
            }
        )
    session.commit()
    load_model_artifacts()
    return artifacts


def get_admin_summary() -> dict[str, Any]:
    return {
        "modelMetrics": get_model_metrics(),
        "alerts": get_alert_feed(6),
        "datasetUploads": len(next(get_db()).query(UploadedDataset).all()),
    }
