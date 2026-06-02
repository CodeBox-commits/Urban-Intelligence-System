from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.sessions import SessionMiddleware

from train_models import MODEL_DIR, ensure_model_artifacts, train_and_save_model

from .config import (
    ADMIN_CREDENTIALS,
    DEFAULT_COUNTRY,
    DEFAULT_STATE,
    FRONTEND_ORIGINS,
    SESSION_SECRET,
    STATE_OPTIONS,
    ZONE_METADATA,
    ZONE_ORDER,
)
from .database import db_cursor
from .init_db import init_database
from .schemas import (
    AQIPredictionInput,
    AccidentPredictionInput,
    LoginPayload,
    SessionResponse,
    WaterPredictionInput,
    WeatherPredictionInput,
)
from .services.weather import build_weather_insights, get_weather_for_city

app = FastAPI(title="UrbanIQ Smart City API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax")

MODEL_FILES = {
    "water": MODEL_DIR / "water_model.pkl",
    "aqi": MODEL_DIR / "aqi_model.pkl",
    "accident": MODEL_DIR / "accident_model.pkl",
}
MODEL_ARTIFACTS: dict[str, dict] = {}

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

DATASET_TABLES = {
    "aqi": "aqi_data",
    "water": "water_data",
    "accident": "accident_data",
    "resource": "resource_data",
    "fuel": "fuel_data",
}


def marker_color_from_risk(risk_level: str) -> str:
    if risk_level == "High":
        return "red"
    if risk_level == "Medium":
        return "orange"
    return "green"


def to_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def to_int(value, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def average(rows: list[dict], key: str) -> float:
    if not rows:
        return 0.0
    return sum(to_float(row[key]) for row in rows) / len(rows)


def pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 1)


def as_trend(current: float, previous: float) -> dict:
    delta = pct_change(current, previous)
    if delta > 0:
        direction = "up"
    elif delta < 0:
        direction = "down"
    else:
        direction = "flat"
    return {"delta": abs(delta), "direction": direction}


def build_pdf(title: str, rows: list[dict]) -> bytes:
    lines = [title, ""]
    if rows:
        headers = list(rows[0].keys())
        lines.append(" | ".join(headers))
        lines.append("-" * 90)
        for row in rows[:28]:
            lines.append(" | ".join(str(row.get(header, "")) for header in headers))
    else:
        lines.append("No data available")

    def escape(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    content_lines = ["BT", "/F1 11 Tf", "50 780 Td", f"({escape(lines[0])}) Tj"]
    y_step = 16
    current_offset = 0
    for line in lines[1:]:
        current_offset -= y_step
        content_lines.append(f"0 {current_offset} Td")
        content_lines.append(f"({escape(line)}) Tj")
        current_offset = 0
    content_lines.append("ET")
    content = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj")
    objects.append(b"2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj"
    )
    objects.append(f"4 0 obj << /Length {len(content)} >> stream\n".encode("latin-1") + content + b"\nendstream endobj")
    objects.append(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj")

    output = io.BytesIO()
    output.write(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(output.tell())
        output.write(obj + b"\n")

    xref_offset = output.tell()
    output.write(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    output.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.write(f"{offset:010d} 00000 n \n".encode("latin-1"))
    output.write(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("latin-1")
    )
    return output.getvalue()


def csv_response(filename: str, rows: list[dict]) -> Response:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()) if rows else ["message"])
    writer.writeheader()
    if rows:
        writer.writerows(rows)
    else:
        writer.writerow({"message": "No data available"})
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def pdf_response(filename: str, title: str, rows: list[dict]) -> Response:
    return Response(
        content=build_pdf(title, rows),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
        except Exception:
            artifact = train_and_save_model(name)
            validate_artifact(name, artifact)

        MODEL_ARTIFACTS[name] = artifact


def current_session_user(request: Request) -> dict:
    user = request.session.get("user")
    if user:
        return user
    return {"email": None, "role": "guest", "is_authenticated": False}


def require_admin(request: Request) -> dict:
    user = current_session_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def prediction_from_artifact(artifact_name: str, payload: dict) -> tuple[str | int, float]:
    artifact = MODEL_ARTIFACTS.get(artifact_name)
    if artifact is None:
        raise HTTPException(status_code=500, detail=f"Model '{artifact_name}' is not loaded.")

    pipeline = artifact["pipeline"]
    feature_names = artifact["feature_names"]
    input_frame = pd.DataFrame([[payload[column] for column in feature_names]], columns=feature_names)

    try:
        prediction = pipeline.predict(input_frame)[0]
        confidence = float(pipeline.predict_proba(input_frame)[0].max())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return prediction, confidence


def filters_clause(state: str, zone: str | None, start_date: str | None, end_date: str | None) -> tuple[str, list]:
    clauses = ["state = ?"]
    values: list = [state]

    if zone and not zone.startswith("All "):
        clauses.append("zone = ?")
        values.append(zone)
    if start_date:
        clauses.append("date >= ?")
        values.append(start_date)
    if end_date:
        clauses.append("date <= ?")
        values.append(end_date)

    return " and ".join(clauses), values


def fetch_rows(table_name: str, state: str, zone: str | None = None, start_date: str | None = None, end_date: str | None = None) -> list[dict]:
    clause, values = filters_clause(state, zone, start_date, end_date)
    with db_cursor() as cursor:
        return cursor.execute(
            f"select * from {table_name} where {clause} order by date asc, zone asc",
            values,
        ).fetchall()


def latest_rows_by_zone(rows: list[dict]) -> list[dict]:
    latest: dict[str, dict] = {}
    for row in rows:
        latest[row["zone"]] = row
    return [latest[zone] for zone in ZONE_ORDER if zone in latest]


def previous_rows_by_zone(rows: list[dict]) -> list[dict]:
    history: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        history[row["zone"]].append(row)

    previous: list[dict] = []
    for zone in ZONE_ORDER:
        zone_rows = history.get(zone, [])
        if len(zone_rows) >= 2:
            previous.append(zone_rows[-2])
        elif zone_rows:
            previous.append(zone_rows[-1])
    return previous


def build_alerts(latest_aqi: list[dict], latest_water: list[dict], latest_accident: list[dict], weather: dict) -> tuple[dict | None, list[dict]]:
    alerts: list[dict] = []

    for row in latest_aqi:
        if to_float(row["aqi"]) >= 150:
            alerts.append(
                {
                    "id": f"aqi-{row['zone']}",
                    "zone": row["zone"],
                    "severity": "critical",
                    "type": "Severe AQI",
                    "message": f"{row['zone']} AQI has reached {int(to_float(row['aqi']))}.",
                }
            )

    for row in latest_water:
        if to_float(row["water_score"]) < 65:
            alerts.append(
                {
                    "id": f"water-{row['zone']}",
                    "zone": row["zone"],
                    "severity": "warning",
                    "type": "Water Risk",
                    "message": f"{row['zone']} water quality needs immediate review.",
                }
            )

    for row in latest_accident:
        if to_float(row["risk_score"]) >= 70:
            alerts.append(
                {
                    "id": f"accident-{row['zone']}",
                    "zone": row["zone"],
                    "severity": "warning",
                    "type": "Accident Risk",
                    "message": f"{row['zone']} risk index is elevated at {int(to_float(row['risk_score']))}%.",
                }
            )

    if weather["condition"].lower() in {"rain", "thunderstorm", "drizzle"}:
        alerts.append(
            {
                "id": "weather-rain",
                "zone": weather["city"],
                "severity": "warning",
                "type": "Weather Warning",
                "message": "Rainfall conditions may increase travel and response risks.",
            }
        )

    banner = alerts[0] if alerts else None
    return banner, alerts


def build_dashboard_payload(state: str, zone: str | None = None) -> dict:
    aqi_rows = fetch_rows("aqi_data", state, zone)
    water_rows = fetch_rows("water_data", state, zone)
    accident_rows = fetch_rows("accident_data", state, zone)
    resource_rows = fetch_rows("resource_data", state, zone)
    fuel_rows = fetch_rows("fuel_data", state, zone)

    latest_aqi = latest_rows_by_zone(aqi_rows)
    previous_aqi = previous_rows_by_zone(aqi_rows)
    latest_water = latest_rows_by_zone(water_rows)
    previous_water = previous_rows_by_zone(water_rows)
    latest_accident = latest_rows_by_zone(accident_rows)
    previous_accident = previous_rows_by_zone(accident_rows)
    latest_resource = latest_rows_by_zone(resource_rows)
    previous_resource = previous_rows_by_zone(resource_rows)
    latest_fuel = latest_rows_by_zone(fuel_rows)
    previous_fuel = previous_rows_by_zone(fuel_rows)

    weather_city = zone if zone and not zone.startswith("All ") else "Hyderabad"
    weather = get_weather_for_city(weather_city)

    current_aqi = round(average(latest_aqi, "aqi"))
    previous_aqi_avg = round(average(previous_aqi, "aqi"))
    current_water = round(average(latest_water, "water_score"))
    previous_water_avg = round(average(previous_water, "water_score"))
    current_risk = round(average(latest_accident, "risk_score"))
    previous_risk_avg = round(average(previous_accident, "risk_score"))
    current_resource = round(average(latest_resource, "utilization"))
    previous_resource_avg = round(average(previous_resource, "utilization"))
    current_fuel = round(
        average(
            [
                {
                    "metric": (
                        to_float(row["petrol_availability"])
                        + to_float(row["diesel_availability"])
                        + to_float(row["lpg_availability"])
                        + to_float(row["ev_utilization"])
                    )
                    / 4
                }
                for row in latest_fuel
            ],
            "metric",
        )
    )
    previous_fuel_avg = round(
        average(
            [
                {
                    "metric": (
                        to_float(row["petrol_availability"])
                        + to_float(row["diesel_availability"])
                        + to_float(row["lpg_availability"])
                        + to_float(row["ev_utilization"])
                    )
                    / 4
                }
                for row in previous_fuel
            ],
            "metric",
        )
    )
    current_alerts = len([row for row in latest_aqi if to_float(row["aqi"]) >= 150]) + len(
        [row for row in latest_accident if to_float(row["risk_score"]) >= 70]
    )
    previous_alerts = len([row for row in previous_aqi if to_float(row["aqi"]) >= 150]) + len(
        [row for row in previous_accident if to_float(row["risk_score"]) >= 70]
    )

    banner, alerts = build_alerts(latest_aqi, latest_water, latest_accident, weather)

    aqi_trend = [{"date": row["date"], "aqi": round(average([row], "aqi"))} for row in latest_aqi]
    map_zones = []
    for aqi_row in latest_aqi:
        water_row = next((row for row in latest_water if row["zone"] == aqi_row["zone"]), None)
        accident_row = next((row for row in latest_accident if row["zone"] == aqi_row["zone"]), None)
        zone_name = aqi_row["zone"]
        risk_level = "High" if accident_row and to_float(accident_row["risk_score"]) >= 70 else "Medium" if accident_row and to_float(accident_row["risk_score"]) >= 40 else "Low"
        map_zones.append(
            {
                "zone": zone_name,
                "coordinates": ZONE_METADATA[zone_name]["coordinates"],
                "riskLevel": risk_level,
                "markerColor": marker_color_from_risk(risk_level),
                "aqi": round(to_float(aqi_row["aqi"])),
                "water_quality": water_row["water_quality"] if water_row else "No Data",
                "risk_score": round(to_float(accident_row["risk_score"])) if accident_row else 0,
                "alerts": len([item for item in alerts if item["zone"] == zone_name]),
            }
        )

    latest_timestamp_candidates = []
    for collection in (latest_aqi, latest_water, latest_accident, latest_resource, latest_fuel):
        latest_timestamp_candidates.extend([row["created_at"] for row in collection if row.get("created_at")])

    last_updated = max(latest_timestamp_candidates) if latest_timestamp_candidates else datetime.utcnow().isoformat()

    return {
        "country": DEFAULT_COUNTRY,
        "state": state,
        "stateOptions": STATE_OPTIONS,
        "zoneOptions": [f"All {state}", *ZONE_ORDER],
        "lastUpdated": last_updated,
        "alertBanner": banner,
        "kpis": [
            {
                "label": "AQI Overview",
                "value": str(current_aqi),
                "helper": "Average across monitored zones",
                "tone": "amber",
                "trend": as_trend(current_aqi, previous_aqi_avg),
            },
            {
                "label": "Water Quality Score",
                "value": f"{current_water}%",
                "helper": "Average potable readiness",
                "tone": "emerald",
                "trend": as_trend(current_water, previous_water_avg),
            },
            {
                "label": "Accident Risk Index",
                "value": f"{current_risk}%",
                "helper": "Road safety pressure",
                "tone": "orange",
                "trend": as_trend(current_risk, previous_risk_avg),
            },
            {
                "label": "Resource Utilization",
                "value": f"{current_resource}%",
                "helper": "Urban infrastructure utilization",
                "tone": "cyan",
                "trend": as_trend(current_resource, previous_resource_avg),
            },
            {
                "label": "Fuel Availability",
                "value": f"{current_fuel}%",
                "helper": "Average energy availability",
                "tone": "slate",
                "trend": as_trend(current_fuel, previous_fuel_avg),
            },
            {
                "label": "Weather Overview",
                "value": f"{weather['temperature']}°C",
                "helper": weather["condition"],
                "tone": "cyan",
                "trend": {"delta": 0, "direction": "flat"},
            },
            {
                "label": "Active Alerts",
                "value": str(current_alerts),
                "helper": "Critical and warning conditions",
                "tone": "rose",
                "trend": as_trend(current_alerts, previous_alerts),
            },
        ],
        "weather": weather | {"insights": build_weather_insights(weather, current_aqi)},
        "aqiTrend": [
            {
                "date": entry_date,
                **{
                    zone_name: round(to_float(row["aqi"]))
                    for zone_name in ZONE_ORDER
                    for row in aqi_rows
                    if row["date"] == entry_date and row["zone"] == zone_name
                },
            }
            for entry_date in sorted({row["date"] for row in aqi_rows})
        ],
        "accidentByZone": [
            {"zone": row["zone"], "risk_score": round(to_float(row["risk_score"])), "riskLevel": marker["riskLevel"]}
            for row in latest_accident
            for marker in map_zones
            if marker["zone"] == row["zone"]
        ],
        "waterQualityByZone": [
            {"zone": row["zone"], "water_score": round(to_float(row["water_score"])), "water_quality": row["water_quality"]}
            for row in latest_water
        ],
        "resourceByZone": [
            {"zone": row["zone"], "utilization": round(to_float(row["utilization"]))}
            for row in latest_resource
        ],
        "fuelByZone": [
            {
                "zone": row["zone"],
                "petrol_availability": round(to_float(row["petrol_availability"])),
                "diesel_availability": round(to_float(row["diesel_availability"])),
                "lpg_availability": round(to_float(row["lpg_availability"])),
                "ev_utilization": round(to_float(row["ev_utilization"])),
            }
            for row in latest_fuel
        ],
        "alerts": alerts,
        "tableRows": map_zones,
        "mapCenter": STATE_OPTIONS[0]["mapCenter"],
        "mapZoom": STATE_OPTIONS[0]["mapZoom"],
        "mapZones": map_zones,
    }


def build_aqi_payload(state: str, zone: str | None, start_date: str | None, end_date: str | None) -> dict:
    rows = fetch_rows("aqi_data", state, zone, start_date, end_date)
    latest = latest_rows_by_zone(rows)
    current = round(average(latest, "aqi")) if latest else 0
    category = "Good" if current <= 50 else "Moderate" if current <= 100 else "Poor" if current <= 150 else "Severe"
    weather_city = zone if zone and not zone.startswith("All ") else "Hyderabad"
    weather = get_weather_for_city(weather_city)
    trend = []
    grouped = defaultdict(list)
    for row in rows:
        grouped[row["date"]].append(to_float(row["aqi"]))
    for entry_date in sorted(grouped):
        trend.append({"date": entry_date, "aqi": round(sum(grouped[entry_date]) / len(grouped[entry_date]))})

    return {
        "state": state,
        "zoneOptions": [f"All {state}", *ZONE_ORDER],
        "currentAqi": current,
        "category": category,
        "pollutants": [
            {"name": "PM2.5", "value": round(current * 0.48)},
            {"name": "PM10", "value": round(current * 0.78)},
            {"name": "NO2", "value": round(current * 0.34)},
            {"name": "SO2", "value": round(current * 0.18)},
            {"name": "CO", "value": round(current * 0.12, 1)},
            {"name": "O3", "value": round(current * 0.28)},
        ],
        "trend": trend,
        "tableRows": [
            {"id": f"{row['zone']}-{row['date']}", "zone": row["zone"], "date": row["date"], "aqi": round(to_float(row["aqi"]))}
            for row in rows
        ],
        "lastUpdated": latest[-1]["created_at"] if latest else None,
        "weather": weather | {"insights": build_weather_insights(weather, current)},
    }


def build_water_payload(state: str, zone: str | None, start_date: str | None, end_date: str | None) -> dict:
    rows = fetch_rows("water_data", state, zone, start_date, end_date)
    latest = latest_rows_by_zone(rows)
    current_score = round(average(latest, "water_score")) if latest else 0
    weather_city = zone if zone and not zone.startswith("All ") else "Hyderabad"
    weather = get_weather_for_city(weather_city)
    grouped = defaultdict(list)
    for row in rows:
        grouped[row["date"]].append(to_float(row["water_score"]))

    trend = [{"date": entry_date, "water_score": round(sum(values) / len(values))} for entry_date, values in sorted(grouped.items())]
    zone_breakdown = [
        {"zone": row["zone"], "water_score": round(to_float(row["water_score"])), "water_quality": row["water_quality"]}
        for row in latest
    ]
    table_rows = [
        {
            "id": f"{row['zone']}-{row['date']}",
            "zone": row["zone"],
            "date": row["date"],
            "water_score": round(to_float(row["water_score"])),
            "water_quality": row["water_quality"],
        }
        for row in rows
    ]
    return {
        "state": state,
        "zoneOptions": [f"All {state}", *ZONE_ORDER],
        "currentScore": current_score,
        "waterQuality": latest[0]["water_quality"] if zone and latest else "Mixed",
        "trend": trend,
        "zoneBreakdown": zone_breakdown,
        "tableRows": table_rows,
        "lastUpdated": latest[-1]["created_at"] if latest else None,
        "weather": weather | {"insights": build_weather_insights(weather)},
    }


def build_accident_payload(state: str, zone: str | None, start_date: str | None, end_date: str | None) -> dict:
    rows = fetch_rows("accident_data", state, zone, start_date, end_date)
    latest = latest_rows_by_zone(rows)
    total_incidents = sum(to_int(row["accident_count"]) for row in rows)
    risk_score = round(average(latest, "risk_score")) if latest else 0
    risk_level = "High" if risk_score >= 70 else "Medium" if risk_score >= 40 else "Low"
    grouped = defaultdict(int)
    for row in rows:
        grouped[row["date"]] += to_int(row["accident_count"])

    trend = [{"date": entry_date, "accident_count": grouped[entry_date]} for entry_date in sorted(grouped)]
    zone_totals = defaultdict(int)
    for row in rows:
        zone_totals[row["zone"]] += to_int(row["accident_count"])

    weather_city = zone if zone and not zone.startswith("All ") else "Hyderabad"
    weather = get_weather_for_city(weather_city)
    return {
        "state": state,
        "zoneOptions": [f"All {state}", *ZONE_ORDER],
        "totalIncidents": total_incidents,
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "trend": trend,
        "zoneTotals": [{"zone": zone_name, "incidents": zone_totals.get(zone_name, 0)} for zone_name in ZONE_ORDER],
        "tableRows": [
            {
                "id": f"{row['zone']}-{row['date']}",
                "zone": row["zone"],
                "date": row["date"],
                "accident_count": to_int(row["accident_count"]),
                "severity": row["severity"],
                "risk_score": round(to_float(row["risk_score"])),
            }
            for row in rows
        ],
        "lastUpdated": latest[-1]["created_at"] if latest else None,
        "weather": weather | {"insights": build_weather_insights(weather)},
    }


def build_fuel_payload(state: str, zone: str | None, start_date: str | None, end_date: str | None) -> dict:
    rows = fetch_rows("fuel_data", state, zone, start_date, end_date)
    latest = latest_rows_by_zone(rows)
    weather_city = zone if zone and not zone.startswith("All ") else "Hyderabad"
    weather = get_weather_for_city(weather_city)
    grouped = defaultdict(list)
    for row in rows:
        grouped[row["date"]].append(row)

    trend = []
    for entry_date in sorted(grouped):
        entries = grouped[entry_date]
        trend.append(
            {
                "date": entry_date,
                "petrol_availability": round(average(entries, "petrol_availability")),
                "diesel_availability": round(average(entries, "diesel_availability")),
                "lpg_availability": round(average(entries, "lpg_availability")),
                "ev_utilization": round(average(entries, "ev_utilization")),
            }
        )

    kpis = {
        "petrolAvailability": round(average(latest, "petrol_availability")) if latest else 0,
        "dieselAvailability": round(average(latest, "diesel_availability")) if latest else 0,
        "lpgAvailability": round(average(latest, "lpg_availability")) if latest else 0,
        "evUtilization": round(average(latest, "ev_utilization")) if latest else 0,
    }

    return {
        "state": state,
        "zoneOptions": [f"All {state}", *ZONE_ORDER],
        **kpis,
        "trend": trend,
        "zoneBreakdown": [
            {
                "zone": row["zone"],
                "petrol_availability": round(to_float(row["petrol_availability"])),
                "diesel_availability": round(to_float(row["diesel_availability"])),
                "lpg_availability": round(to_float(row["lpg_availability"])),
                "ev_utilization": round(to_float(row["ev_utilization"])),
            }
            for row in latest
        ],
        "tableRows": [
            {
                "id": f"{row['zone']}-{row['date']}",
                "zone": row["zone"],
                "date": row["date"],
                "petrol_availability": round(to_float(row["petrol_availability"])),
                "diesel_availability": round(to_float(row["diesel_availability"])),
                "lpg_availability": round(to_float(row["lpg_availability"])),
                "ev_utilization": round(to_float(row["ev_utilization"])),
            }
            for row in rows
        ],
        "lastUpdated": latest[-1]["created_at"] if latest else None,
        "weather": weather | {"insights": build_weather_insights(weather)},
    }


def table_rows_for_export(dataset: str, state: str, zone: str | None, start_date: str | None, end_date: str | None) -> list[dict]:
    builders = {
        "aqi": build_aqi_payload,
        "water": build_water_payload,
        "accident": build_accident_payload,
        "fuel": build_fuel_payload,
    }
    if dataset not in builders:
        raise HTTPException(status_code=404, detail="Unknown dataset.")
    return builders[dataset](state, zone, start_date, end_date)["tableRows"]


def insert_upload_history(dataset_name: str, rows_uploaded: int, uploaded_by: str) -> None:
    with db_cursor() as cursor:
        cursor.execute(
            "insert into upload_history (dataset_name, rows_uploaded, uploaded_by) values (?, ?, ?)",
            (dataset_name, rows_uploaded, uploaded_by),
        )


def parse_csv_upload(upload: UploadFile) -> list[dict]:
    contents = upload.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(contents))
    return [{key.strip().lower(): (value.strip() if isinstance(value, str) else value) for key, value in row.items()} for row in reader]


def wipe_dataset(table_name: str, state: str) -> None:
    with db_cursor() as cursor:
        cursor.execute(f"delete from {table_name} where state = ?", (state,))


def normalize_upload_rows(dataset: str, rows: list[dict], state: str) -> list[dict]:
    normalized = []

    for row in rows:
        zone = row.get("zone")
        if not zone:
            continue

        if dataset == "aqi":
            normalized.append(
                (
                    DEFAULT_COUNTRY,
                    row.get("state") or state,
                    zone,
                    row.get("date") or datetime.utcnow().date().isoformat(),
                    to_float(row.get("aqi"), 0),
                )
            )
        elif dataset == "water":
            water_score = to_float(row.get("water_score"), 0)
            if water_score == 0:
                water_score = max(
                    35,
                    min(
                        98,
                        100
                        - abs(to_float(row.get("ph"), 7.0) - 7.2) * 10
                        - to_float(row.get("turbidity"), 0) * 2
                        - to_float(row.get("solids"), 0) / 1800,
                    ),
                )
            normalized.append(
                (
                    DEFAULT_COUNTRY,
                    row.get("state") or state,
                    zone,
                    row.get("date") or datetime.utcnow().date().isoformat(),
                    to_float(row.get("ph"), 7.1),
                    to_float(row.get("turbidity"), 2.8),
                    to_float(row.get("solids"), 17500),
                    to_float(row.get("chloramines"), 3.1),
                    to_float(row.get("sulfate"), 300),
                    to_float(row.get("conductivity"), 410),
                    to_float(row.get("organic_carbon"), 11.2),
                    to_float(row.get("hardness"), 182),
                    to_float(row.get("temperature"), 24.6),
                    to_float(row.get("dissolved_oxygen"), 7.6),
                    1 if str(row.get("potability", "1")).strip() in {"1", "true", "potable"} else 0,
                    round(water_score),
                    row.get("water_quality") or ("Potable" if water_score >= 80 else "Needs Review" if water_score >= 65 else "Not Potable"),
                )
            )
        elif dataset == "accident":
            accident_count = to_int(row.get("accident_count"), 0)
            risk_score = to_float(row.get("risk_score"), min(95, max(18, accident_count * 11)))
            severity = row.get("severity") or ("High" if risk_score >= 70 else "Medium" if risk_score >= 40 else "Low")
            normalized.append(
                (
                    DEFAULT_COUNTRY,
                    row.get("state") or state,
                    zone,
                    row.get("date") or datetime.utcnow().date().isoformat(),
                    accident_count,
                    severity,
                    risk_score,
                )
            )
        elif dataset == "resource":
            utilization = to_float(row.get("utilization"), 70)
            normalized.append(
                (
                    DEFAULT_COUNTRY,
                    row.get("state") or state,
                    zone,
                    row.get("date") or datetime.utcnow().date().isoformat(),
                    utilization,
                    to_float(row.get("electricity_load"), utilization + 4),
                    to_float(row.get("sanitation_score"), utilization + 6),
                    to_float(row.get("drainage_score"), utilization + 2),
                )
            )
        elif dataset == "fuel":
            normalized.append(
                (
                    DEFAULT_COUNTRY,
                    row.get("state") or state,
                    zone,
                    row.get("date") or datetime.utcnow().date().isoformat(),
                    to_float(row.get("petrol_availability"), 70),
                    to_float(row.get("diesel_availability"), 68),
                    to_float(row.get("lpg_availability"), 80),
                    to_float(row.get("ev_utilization"), 50),
                )
            )

    return normalized


def insert_dataset_rows(dataset: str, rows: list[tuple]) -> int:
    statements = {
        "aqi": (
            "insert into aqi_data (country, state, zone, date, aqi) values (?, ?, ?, ?, ?)",
            "aqi_data",
        ),
        "water": (
            """
            insert into water_data (
              country, state, zone, date, ph, turbidity, solids, chloramines, sulfate,
              conductivity, organic_carbon, hardness, temperature, dissolved_oxygen,
              potability, water_score, water_quality
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            "water_data",
        ),
        "accident": (
            "insert into accident_data (country, state, zone, date, accident_count, severity, risk_score) values (?, ?, ?, ?, ?, ?, ?)",
            "accident_data",
        ),
        "resource": (
            "insert into resource_data (country, state, zone, date, utilization, electricity_load, sanitation_score, drainage_score) values (?, ?, ?, ?, ?, ?, ?, ?)",
            "resource_data",
        ),
        "fuel": (
            "insert into fuel_data (country, state, zone, date, petrol_availability, diesel_availability, lpg_availability, ev_utilization) values (?, ?, ?, ?, ?, ?, ?, ?)",
            "fuel_data",
        ),
    }

    statement, table_name = statements[dataset]
    state = rows[0][1] if rows else DEFAULT_STATE
    wipe_dataset(table_name, state)

    with db_cursor() as cursor:
        cursor.executemany(statement, rows)

    return len(rows)


@app.on_event("startup")
def startup_event() -> None:
    init_database()
    load_artifacts()


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "models": list(MODEL_ARTIFACTS.keys()), "database": "ok"}


@app.post("/auth/login", response_model=SessionResponse)
def login(payload: LoginPayload, request: Request) -> SessionResponse:
    normalized_email = payload.email.strip().lower()
    is_admin = ADMIN_CREDENTIALS.get(normalized_email) == payload.password
    role = "admin" if is_admin else "user"
    request.session["user"] = {"email": normalized_email, "role": role, "is_authenticated": True}
    return SessionResponse(email=normalized_email, role=role, is_authenticated=True)


@app.post("/auth/logout", response_model=SessionResponse)
def logout(request: Request) -> SessionResponse:
    request.session.clear()
    return SessionResponse(email=None, role="guest", is_authenticated=False)


@app.get("/auth/session", response_model=SessionResponse)
def session(request: Request) -> SessionResponse:
    user = current_session_user(request)
    return SessionResponse(
        email=user.get("email"),
        role=user.get("role", "guest"),
        is_authenticated=bool(user.get("is_authenticated")),
    )


@app.get("/api/meta")
def get_meta() -> dict:
    return {
        "stateOptions": STATE_OPTIONS,
        "zoneOptions": {DEFAULT_STATE: ZONE_ORDER},
        "defaultState": DEFAULT_STATE,
    }


@app.get("/api/dashboard")
def get_dashboard(state: str = Query(DEFAULT_STATE), zone: str | None = Query(default=None)) -> dict:
    return build_dashboard_payload(state, zone)


@app.get("/api/analytics/aqi")
def get_aqi_analytics(
    state: str = Query(DEFAULT_STATE),
    zone: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> dict:
    return build_aqi_payload(state, zone, start_date, end_date)


@app.get("/api/analytics/water")
def get_water_analytics(
    state: str = Query(DEFAULT_STATE),
    zone: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> dict:
    return build_water_payload(state, zone, start_date, end_date)


@app.get("/api/analytics/accidents")
def get_accident_analytics(
    state: str = Query(DEFAULT_STATE),
    zone: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> dict:
    return build_accident_payload(state, zone, start_date, end_date)


@app.get("/api/analytics/fuel")
def get_fuel_analytics(
    state: str = Query(DEFAULT_STATE),
    zone: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> dict:
    return build_fuel_payload(state, zone, start_date, end_date)


@app.get("/api/weather")
def get_weather(city: str = Query("Hyderabad"), state: str | None = Query(default=None)) -> dict:
    weather = get_weather_for_city(city)
    return weather | {"insights": build_weather_insights(weather)}


@app.get("/api/admin/upload-history")
def get_upload_history(request: Request) -> dict:
    require_admin(request)
    with db_cursor() as cursor:
        rows = cursor.execute(
            "select id, dataset_name, upload_date, rows_uploaded, uploaded_by from upload_history order by upload_date desc, id desc limit 50"
        ).fetchall()
    return {"items": rows}


@app.post("/api/admin/upload/{dataset}")
def upload_dataset(
    dataset: str,
    request: Request,
    file: UploadFile = File(...),
    state: str = Query(DEFAULT_STATE),
) -> dict:
    user = require_admin(request)

    if dataset not in DATASET_TABLES:
        raise HTTPException(status_code=404, detail="Unknown dataset.")

    rows = parse_csv_upload(file)
    normalized = normalize_upload_rows(dataset, rows, state)
    if not normalized:
        raise HTTPException(status_code=400, detail="No valid rows found in the uploaded CSV.")

    inserted_count = insert_dataset_rows(dataset, normalized)
    insert_upload_history(f"{dataset}_data", inserted_count, user["email"] or "admin")
    return {"dataset": dataset, "rowsInserted": inserted_count, "uploadedBy": user["email"]}


@app.get("/api/export/{dataset}")
def export_dataset(
    dataset: str,
    format: str = Query("csv"),
    state: str = Query(DEFAULT_STATE),
    zone: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
) -> Response:
    rows = table_rows_for_export(dataset, state, zone, start_date, end_date)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    if format == "pdf":
        return pdf_response(f"{dataset}-{timestamp}.pdf", f"UrbanIQ {dataset.title()} Export", rows)
    return csv_response(f"{dataset}-{timestamp}.csv", rows)


@app.post("/predict/water")
def predict_water(input_data: WaterPredictionInput) -> dict:
    prediction, confidence = prediction_from_artifact("water", input_data.model_dump())
    return {"potability": int(prediction), "confidence": round(confidence, 4)}


@app.post("/predict/aqi")
def predict_aqi(input_data: AQIPredictionInput) -> dict:
    prediction, confidence = prediction_from_artifact("aqi", input_data.model_dump())
    return {"aqi_category": str(prediction), "confidence": round(confidence, 4)}


@app.post("/predict/accident")
def predict_accident(input_data: AccidentPredictionInput) -> dict:
    prediction, confidence = prediction_from_artifact("accident", input_data.model_dump())
    return {"accident_risk": str(prediction), "confidence": round(confidence, 4)}
