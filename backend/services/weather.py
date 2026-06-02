from __future__ import annotations

import json
from urllib.parse import urlencode
from urllib.request import urlopen

from ..config import OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL


MOCK_WEATHER = {
    "Hyderabad": {"temperature": 34, "humidity": 41, "wind_speed": 4.2, "condition": "Clear"},
    "Warangal": {"temperature": 32, "humidity": 56, "wind_speed": 3.4, "condition": "Clouds"},
    "Karimnagar": {"temperature": 31, "humidity": 49, "wind_speed": 2.9, "condition": "Clear"},
    "Nizamabad": {"temperature": 30, "humidity": 52, "wind_speed": 3.1, "condition": "Clouds"},
    "Khammam": {"temperature": 29, "humidity": 71, "wind_speed": 4.8, "condition": "Rain"},
    "Mahbubnagar": {"temperature": 35, "humidity": 35, "wind_speed": 3.9, "condition": "Haze"},
}


def build_weather_insights(weather: dict, current_aqi: float | None = None) -> list[str]:
    insights: list[str] = []

    if weather["temperature"] >= 36:
        insights.append("Heat Alert: High temperatures may increase urban stress.")
    if weather["condition"].lower() in {"rain", "thunderstorm", "drizzle"}:
        insights.append("Accident Risk Warning: Wet roads can elevate incident probability.")
    if weather["humidity"] <= 35:
        insights.append("Water Scarcity Alert: Low humidity can increase demand pressure.")
    if current_aqi is not None and current_aqi >= 140:
        insights.append("Pollution Alert: Poor AQI requires immediate attention.")

    if not insights:
        insights.append("Conditions are stable across the selected zone.")

    return insights


def get_weather_for_city(city: str) -> dict:
    fallback = MOCK_WEATHER.get(city, MOCK_WEATHER["Hyderabad"]) | {"city": city, "source": "mock"}

    if not OPENWEATHER_API_KEY:
        return fallback

    params = urlencode({"q": f"{city},IN", "appid": OPENWEATHER_API_KEY, "units": "metric"})
    url = f"{OPENWEATHER_BASE_URL}?{params}"

    try:
        with urlopen(url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))

        return {
            "city": city,
            "temperature": round(float(payload["main"]["temp"])),
            "humidity": int(payload["main"]["humidity"]),
            "wind_speed": round(float(payload["wind"]["speed"]), 1),
            "condition": payload["weather"][0]["main"],
            "source": "openweathermap",
        }
    except Exception:
        return fallback

