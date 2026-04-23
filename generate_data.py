from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def sigmoid(values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-values))


def generate_water_dataset(n_rows: int = 5500, random_state: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    ph = np.clip(rng.normal(7.1, 1.0, n_rows), 4.5, 9.7)
    turbidity = np.clip(rng.gamma(2.1, 1.8, n_rows), 0.2, 12.5)
    solids = np.clip(rng.normal(17500, 6500, n_rows), 1800, 36000)
    chloramines = np.clip(rng.normal(5.1, 2.0, n_rows), 0.5, 11.5)
    sulfate = np.clip(rng.normal(265, 85, n_rows), 80, 460)
    conductivity = np.clip(rng.normal(405, 120, n_rows), 110, 720)
    organic_carbon = np.clip(rng.normal(12.5, 4.5, n_rows), 1.5, 26.0)
    hardness = np.clip(rng.normal(190, 55, n_rows), 45, 340)
    temperature = np.clip(rng.normal(23.0, 5.8, n_rows), 6, 38)
    dissolved_oxygen = np.clip(rng.normal(7.4, 1.8, n_rows), 2.0, 13.5)

    quality_score = (
        3.3
        - 1.25 * np.abs(ph - 7.2)
        - 0.32 * turbidity
        - 0.00008 * np.maximum(solids - 15500, 0)
        - 0.22 * np.maximum(chloramines - 4.0, 0)
        - 0.0035 * np.abs(sulfate - 270)
        - 0.0025 * np.abs(conductivity - 380)
        - 0.09 * np.maximum(organic_carbon - 12.5, 0)
        - 0.006 * np.abs(hardness - 180)
        - 0.11 * np.maximum(temperature - 27, 0)
        + 0.38 * (dissolved_oxygen - 7.1)
        + rng.normal(0, 0.24, n_rows)
    )
    base_potability = (quality_score > 0.0).astype(int)
    label_flip = rng.random(n_rows) < 0.08
    potability = np.where(label_flip, 1 - base_potability, base_potability)

    return pd.DataFrame(
        {
            "ph": ph.round(3),
            "turbidity": turbidity.round(3),
            "solids": solids.round(3),
            "chloramines": chloramines.round(3),
            "sulfate": sulfate.round(3),
            "conductivity": conductivity.round(3),
            "organic_carbon": organic_carbon.round(3),
            "hardness": hardness.round(3),
            "temperature": temperature.round(3),
            "dissolved_oxygen": dissolved_oxygen.round(3),
            "potability": potability.astype(int),
        }
    )


def generate_aqi_dataset(n_rows: int = 5600, random_state: int = 52) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    pm25 = np.clip(rng.gamma(3.2, 18, n_rows), 8, 240)
    pm10 = np.clip(pm25 * rng.normal(1.35, 0.24, n_rows) + rng.normal(8, 12, n_rows), 20, 360)
    no2 = np.clip(rng.normal(42, 18, n_rows) + 0.08 * pm25, 6, 120)
    so2 = np.clip(rng.normal(21, 10, n_rows) + 0.04 * pm10, 2, 70)
    co = np.clip(rng.normal(1.2, 0.45, n_rows) + 0.01 * pm25, 0.2, 5.5)
    o3 = np.clip(rng.normal(34, 14, n_rows) + rng.normal(0, 6, n_rows), 5, 120)
    nh3 = np.clip(rng.normal(28, 12, n_rows) + 0.03 * pm10, 2, 90)
    temperature = np.clip(rng.normal(29, 6.5, n_rows), 12, 44)
    humidity = np.clip(rng.normal(58, 18, n_rows), 18, 96)
    wind_speed = np.clip(rng.normal(3.2, 1.7, n_rows), 0.3, 12)

    latent_aqi = (
        0.58 * pm25
        + 0.20 * pm10
        + 0.16 * no2
        + 0.10 * so2
        + 20.0 * co
        + 0.09 * o3
        + 0.05 * nh3
        + 0.10 * humidity
        - 1.7 * wind_speed
        + 1.0 * np.maximum(temperature - 32, 0)
        + rng.normal(0, 7, n_rows)
    )

    thresholds = np.column_stack(
        [
            rng.normal(58, 4, n_rows),
            rng.normal(112, 5, n_rows),
            rng.normal(168, 6, n_rows),
            rng.normal(245, 8, n_rows),
        ]
    )

    categories = []
    labels = ["Good", "Moderate", "Poor", "Very Poor", "Severe"]
    for score, row_thresholds in zip(latent_aqi, thresholds):
        if score <= row_thresholds[0]:
            category = labels[0]
        elif score <= row_thresholds[1]:
            category = labels[1]
        elif score <= row_thresholds[2]:
            category = labels[2]
        elif score <= row_thresholds[3]:
            category = labels[3]
        else:
            category = labels[4]

        if rng.random() < 0.05:
            current_index = labels.index(category)
            shift = rng.choice([-1, 1])
            current_index = int(np.clip(current_index + shift, 0, len(labels) - 1))
            category = labels[current_index]

        categories.append(category)

    return pd.DataFrame(
        {
            "pm25": pm25.round(3),
            "pm10": pm10.round(3),
            "no2": no2.round(3),
            "so2": so2.round(3),
            "co": co.round(3),
            "o3": o3.round(3),
            "nh3": nh3.round(3),
            "temperature": temperature.round(3),
            "humidity": humidity.round(3),
            "wind_speed": wind_speed.round(3),
            "aqi_category": categories,
        }
    )


def generate_accident_dataset(n_rows: int = 5300, random_state: int = 62) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    weather_options = np.array(["Clear", "Rain", "Fog", "Storm", "Drizzle"])
    road_type_options = np.array(["Highway", "Urban", "Rural", "Intersection"])
    lighting_options = np.array(["Daylight", "Night-lit", "Night-unlit", "Dawn/Dusk"])
    traffic_options = np.array(["Low", "Medium", "High", "Very High"])
    time_options = np.array(["Morning", "Afternoon", "Evening", "Night"])

    weather = rng.choice(weather_options, size=n_rows, p=[0.38, 0.24, 0.10, 0.05, 0.23])
    visibility = np.clip(rng.normal(5.4, 2.1, n_rows), 0.4, 10.0)
    road_type = rng.choice(road_type_options, size=n_rows, p=[0.24, 0.40, 0.20, 0.16])
    lighting = rng.choice(lighting_options, size=n_rows, p=[0.42, 0.26, 0.16, 0.16])
    traffic_density = rng.choice(traffic_options, size=n_rows, p=[0.18, 0.36, 0.30, 0.16])
    speed_limit = rng.choice(np.array([30, 40, 50, 60, 80, 100]), size=n_rows, p=[0.10, 0.18, 0.22, 0.22, 0.18, 0.10])
    time_of_day = rng.choice(time_options, size=n_rows, p=[0.28, 0.24, 0.24, 0.24])

    weather_score = pd.Series(weather).map(
        {"Clear": 0.0, "Drizzle": 0.5, "Rain": 1.2, "Fog": 1.6, "Storm": 2.0}
    )
    road_score = pd.Series(road_type).map(
        {"Urban": 0.9, "Intersection": 1.4, "Highway": 1.2, "Rural": 0.6}
    )
    lighting_score = pd.Series(lighting).map(
        {"Daylight": 0.0, "Dawn/Dusk": 0.7, "Night-lit": 0.9, "Night-unlit": 1.5}
    )
    traffic_score = pd.Series(traffic_density).map(
        {"Low": 0.0, "Medium": 0.8, "High": 1.4, "Very High": 1.9}
    )
    time_score = pd.Series(time_of_day).map(
        {"Morning": 0.4, "Afternoon": 0.2, "Evening": 0.9, "Night": 1.3}
    )

    risk_signal = (
        1.2
        + weather_score
        + road_score
        + lighting_score
        + traffic_score
        + time_score
        + 0.03 * (speed_limit - 40)
        + 0.55 * np.maximum(4.5 - visibility, 0)
        + 0.6 * ((speed_limit >= 80) & np.isin(weather, ["Rain", "Fog", "Storm"])).astype(float)
        + rng.normal(0, 0.28, n_rows)
    )

    bins = np.column_stack([rng.normal(3.8, 0.22, n_rows), rng.normal(6.3, 0.28, n_rows)])
    accident_risk = []
    labels = ["Low", "Medium", "High"]
    for signal, row_bins in zip(risk_signal, bins):
        if signal <= row_bins[0]:
            label = labels[0]
        elif signal <= row_bins[1]:
            label = labels[1]
        else:
            label = labels[2]

        if rng.random() < 0.04:
            current_index = labels.index(label)
            shift = rng.choice([-1, 1])
            current_index = int(np.clip(current_index + shift, 0, len(labels) - 1))
            label = labels[current_index]

        accident_risk.append(label)

    return pd.DataFrame(
        {
            "weather": weather,
            "visibility": visibility.round(3),
            "road_type": road_type,
            "lighting": lighting,
            "traffic_density": traffic_density,
            "speed_limit": speed_limit.astype(int),
            "time_of_day": time_of_day,
            "accident_risk": accident_risk,
        }
    )


def generate_all_datasets() -> dict[str, Path]:
    water_path = DATA_DIR / "water_synthetic.csv"
    aqi_path = DATA_DIR / "aqi_synthetic.csv"
    accident_path = DATA_DIR / "accident_synthetic.csv"

    generate_water_dataset().to_csv(water_path, index=False)
    generate_aqi_dataset().to_csv(aqi_path, index=False)
    generate_accident_dataset().to_csv(accident_path, index=False)

    return {
        "water": water_path,
        "aqi": aqi_path,
        "accident": accident_path,
    }


if __name__ == "__main__":
    output_paths = generate_all_datasets()
    for name, path in output_paths.items():
        print(f"{name}: {path}")
