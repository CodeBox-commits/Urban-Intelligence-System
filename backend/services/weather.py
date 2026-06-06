from __future__ import annotations

import json
import logging
from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ..config import OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL

SUPPORTED_CITIES = {
    "Hyderabad",
    "Warangal",
    "Karimnagar",
    "Nizamabad",
    "Khammam",
    "Mahbubnagar",
}

MOCK_WEATHER = {
    "Hyderabad": {"temperature": 34, "humidity": 41, "wind_speed": 4.2, "condition": "Clear", "icon": "01d"},
    "Warangal": {"temperature": 32, "humidity": 56, "wind_speed": 3.4, "condition": "Clouds", "icon": "03d"},
    "Karimnagar": {"temperature": 31, "humidity": 49, "wind_speed": 2.9, "condition": "Clear", "icon": "01d"},
    "Nizamabad": {"temperature": 30, "humidity": 52, "wind_speed": 3.1, "condition": "Clouds", "icon": "03d"},
    "Khammam": {"temperature": 29, "humidity": 71, "wind_speed": 4.8, "condition": "Rain", "icon": "09d"},
    "Mahbubnagar": {"temperature": 35, "humidity": 35, "wind_speed": 3.9, "condition": "Haze", "icon": "50d"},
}


def build_weather_insights(weather: dict, current_aqi: float | None = None) -> list[str]:
    insights: list[str] = []

    if weather["temperature"] >= 40:
        insights.append("Heat Alert: High temperatures may increase urban stress.")
    if weather["condition"].lower() in {"rain", "thunderstorm", "drizzle"}:
        insights.append("Accident Risk Warning: Wet roads can elevate incident probability.")
    if weather["humidity"] < 20:
        insights.append("Water Scarcity Alert: Low humidity can increase demand pressure.")
    if current_aqi is not None and current_aqi >= 140:
        insights.append("Pollution Alert: Poor AQI requires immediate attention.")

    if not insights:
        insights.append("Conditions are stable across the selected zone.")

    return insights


def build_fallback_weather(city: str) -> dict:
    normalized_city = city.strip().title()
    if normalized_city not in SUPPORTED_CITIES:
        logging.warning("Unsupported weather city '%s'. Falling back to Hyderabad.", city)
        normalized_city = "Hyderabad"

    base = MOCK_WEATHER.get(normalized_city, MOCK_WEATHER["Hyderabad"])
    return {
        "city": normalized_city,
        "temperature": base["temperature"],
        "humidity": base["humidity"],
        "wind_speed": base["wind_speed"],
        "condition": base["condition"],
        "icon": base.get("icon", "01d"),
        "source": "mock",
        "last_updated": datetime.utcnow().isoformat(),
    }


def get_weather_for_city(city: str) -> dict:
    city_name = city.strip().title() if city else "Hyderabad"
    if city_name not in SUPPORTED_CITIES:
        logging.warning("Unsupported weather city '%s'. Using Hyderabad for live weather request.", city)
        city_name = "Hyderabad"

    fallback = build_fallback_weather(city_name)
    if not OPENWEATHER_API_KEY:
        return fallback

    params = urlencode({"q": f"{city_name},IN", "appid": OPENWEATHER_API_KEY, "units": "metric"})
    url = f"{OPENWEATHER_BASE_URL.rstrip('/')}/weather?{params}"

    try:
        request = Request(url, headers={"User-Agent": "UrbanIQ/1.0"})
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))

        weather_items = payload.get("weather") or []
        weather_item = weather_items[0] if weather_items else {}
        main = payload.get("main", {})
        wind = payload.get("wind", {})

        return {
            "city": city_name,
            "temperature": round(float(main.get("temp", fallback["temperature"]))),
            "humidity": int(main.get("humidity", fallback["humidity"])),
            "wind_speed": round(float(wind.get("speed", fallback["wind_speed"])), 1),
            "condition": str(weather_item.get("main", fallback["condition"])),
            "icon": str(weather_item.get("icon", fallback["icon"])),
            "source": "openweathermap",
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logging.exception("OpenWeather API request failed for city=%s", city_name)
        return fallback

