from __future__ import annotations

from datetime import date, timedelta

from .config import DEFAULT_COUNTRY, DEFAULT_DAYS, DEFAULT_STATE, ZONE_ORDER
from .database import db_cursor


ZONE_BASELINES = {
    "Hyderabad": {
        "aqi": 148,
        "water_score": 84,
        "risk_score": 74,
        "resource_utilization": 81,
        "fuel": {"petrol": 74, "diesel": 71, "lpg": 82, "ev": 62},
    },
    "Warangal": {
        "aqi": 116,
        "water_score": 88,
        "risk_score": 51,
        "resource_utilization": 76,
        "fuel": {"petrol": 79, "diesel": 76, "lpg": 85, "ev": 55},
    },
    "Karimnagar": {
        "aqi": 82,
        "water_score": 92,
        "risk_score": 31,
        "resource_utilization": 69,
        "fuel": {"petrol": 84, "diesel": 81, "lpg": 88, "ev": 46},
    },
    "Nizamabad": {
        "aqi": 91,
        "water_score": 89,
        "risk_score": 37,
        "resource_utilization": 72,
        "fuel": {"petrol": 81, "diesel": 77, "lpg": 86, "ev": 49},
    },
    "Khammam": {
        "aqi": 109,
        "water_score": 73,
        "risk_score": 58,
        "resource_utilization": 75,
        "fuel": {"petrol": 72, "diesel": 69, "lpg": 79, "ev": 58},
    },
    "Mahbubnagar": {
        "aqi": 137,
        "water_score": 66,
        "risk_score": 72,
        "resource_utilization": 79,
        "fuel": {"petrol": 68, "diesel": 65, "lpg": 76, "ev": 61},
    },
}


def water_quality_from_score(score: float) -> str:
    if score >= 80:
        return "Potable"
    if score >= 65:
        return "Needs Review"
    return "Not Potable"


def severity_from_count(count: int) -> str:
    if count >= 8:
        return "High"
    if count >= 4:
        return "Medium"
    return "Low"


def create_tables() -> None:
    with db_cursor() as cursor:
        cursor.executescript(
            """
            create table if not exists aqi_data (
              id integer primary key autoincrement,
              country text not null,
              state text not null,
              zone text not null,
              date text not null,
              aqi real not null,
              created_at text not null default current_timestamp
            );

            create table if not exists water_data (
              id integer primary key autoincrement,
              country text not null,
              state text not null,
              zone text not null,
              date text not null,
              ph real not null,
              turbidity real not null,
              solids real not null,
              chloramines real not null,
              sulfate real not null,
              conductivity real not null,
              organic_carbon real not null,
              hardness real not null,
              temperature real not null,
              dissolved_oxygen real not null,
              potability integer not null,
              water_score real not null,
              water_quality text not null,
              created_at text not null default current_timestamp
            );

            create table if not exists accident_data (
              id integer primary key autoincrement,
              country text not null,
              state text not null,
              zone text not null,
              date text not null,
              accident_count integer not null,
              severity text not null,
              risk_score real not null,
              created_at text not null default current_timestamp
            );

            create table if not exists resource_data (
              id integer primary key autoincrement,
              country text not null,
              state text not null,
              zone text not null,
              date text not null,
              utilization real not null,
              electricity_load real not null,
              sanitation_score real not null,
              drainage_score real not null,
              created_at text not null default current_timestamp
            );

            create table if not exists fuel_data (
              id integer primary key autoincrement,
              country text not null,
              state text not null,
              zone text not null,
              date text not null,
              petrol_availability real not null,
              diesel_availability real not null,
              lpg_availability real not null,
              ev_utilization real not null,
              created_at text not null default current_timestamp
            );

            create table if not exists upload_history (
              id integer primary key autoincrement,
              dataset_name text not null,
              upload_date text not null default current_timestamp,
              rows_uploaded integer not null,
              uploaded_by text not null
            );

            create index if not exists idx_aqi_state_zone_date on aqi_data (state, zone, date);
            create index if not exists idx_water_state_zone_date on water_data (state, zone, date);
            create index if not exists idx_accident_state_zone_date on accident_data (state, zone, date);
            create index if not exists idx_resource_state_zone_date on resource_data (state, zone, date);
            create index if not exists idx_fuel_state_zone_date on fuel_data (state, zone, date);
            """
        )


def table_is_empty(table_name: str) -> bool:
    with db_cursor() as cursor:
        row = cursor.execute(f"select count(*) as count from {table_name}").fetchone()
        return not row or int(row["count"]) == 0


def seed_demo_data() -> None:
    if not all(
        table_is_empty(table_name)
        for table_name in ("aqi_data", "water_data", "accident_data", "resource_data", "fuel_data")
    ):
        return

    today = date.today()
    offsets = [-9, -5, -2, 0]
    aqi_variation = [-10, -5, 0, 12, 8, 3, -2, 7, 11, 5, 1, -4, 2, 6]
    risk_variation = [-6, -4, -1, 3, 5, 2, -2, 1, 4, 6, 3, 0, 2, 5]
    water_variation = [2, 1, 0, -1, -2, -1, 0, 1, 2, 1, 0, -1, 1, 2]
    resource_variation = [1, 0, -1, 2, 1, 0, -1, 1, 2, 1, 0, -1, 1, 2]
    fuel_variation = [-2, -1, 0, 1, 2, 1, 0, -1, 1, 2, 1, 0, -1, 1]

    with db_cursor() as cursor:
        for zone_index, zone_name in enumerate(ZONE_ORDER):
            baseline = ZONE_BASELINES[zone_name]

            for day_index in range(DEFAULT_DAYS):
                entry_date = (today - timedelta(days=(DEFAULT_DAYS - day_index - 1))).isoformat()
                aqi = max(48, baseline["aqi"] + aqi_variation[day_index] + offsets[zone_index % len(offsets)])
                water_score = max(42, min(97, baseline["water_score"] + water_variation[day_index] - zone_index))
                risk_score = max(18, min(96, baseline["risk_score"] + risk_variation[day_index]))
                utilization = max(44, min(96, baseline["resource_utilization"] + resource_variation[day_index]))
                accident_count = max(1, round((risk_score / 12) + (day_index % 3)))

                cursor.execute(
                    """
                    insert into aqi_data (country, state, zone, date, aqi)
                    values (?, ?, ?, ?, ?)
                    """,
                    (DEFAULT_COUNTRY, DEFAULT_STATE, zone_name, entry_date, aqi),
                )

                cursor.execute(
                    """
                    insert into water_data (
                      country, state, zone, date, ph, turbidity, solids, chloramines, sulfate,
                      conductivity, organic_carbon, hardness, temperature, dissolved_oxygen,
                      potability, water_score, water_quality
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        DEFAULT_COUNTRY,
                        DEFAULT_STATE,
                        zone_name,
                        entry_date,
                        round(7.3 - (day_index % 3) * 0.1 - zone_index * 0.04, 2),
                        round(2.4 + zone_index * 0.55 + (day_index % 4) * 0.2, 2),
                        16000 + zone_index * 1800 + day_index * 140,
                        round(3.0 + zone_index * 0.3, 2),
                        round(290 + zone_index * 14 + day_index * 2, 2),
                        round(390 + zone_index * 22 + day_index * 3, 2),
                        round(11.2 + zone_index * 0.8, 2),
                        round(176 + zone_index * 9, 2),
                        round(24.1 + zone_index * 0.7, 2),
                        round(8.1 - zone_index * 0.45, 2),
                        1 if water_score >= 80 else 0,
                        water_score,
                        water_quality_from_score(water_score),
                    ),
                )

                cursor.execute(
                    """
                    insert into accident_data (country, state, zone, date, accident_count, severity, risk_score)
                    values (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        DEFAULT_COUNTRY,
                        DEFAULT_STATE,
                        zone_name,
                        entry_date,
                        accident_count,
                        severity_from_count(accident_count),
                        risk_score,
                    ),
                )

                cursor.execute(
                    """
                    insert into resource_data (country, state, zone, date, utilization, electricity_load, sanitation_score, drainage_score)
                    values (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        DEFAULT_COUNTRY,
                        DEFAULT_STATE,
                        zone_name,
                        entry_date,
                        utilization,
                        max(45, min(96, utilization + 5 - zone_index)),
                        max(35, min(98, utilization + 10 - day_index % 5)),
                        max(32, min(95, utilization + 4 - zone_index * 2)),
                    ),
                )

                cursor.execute(
                    """
                    insert into fuel_data (country, state, zone, date, petrol_availability, diesel_availability, lpg_availability, ev_utilization)
                    values (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        DEFAULT_COUNTRY,
                        DEFAULT_STATE,
                        zone_name,
                        entry_date,
                        max(40, min(98, baseline["fuel"]["petrol"] + fuel_variation[day_index])),
                        max(38, min(96, baseline["fuel"]["diesel"] + fuel_variation[day_index] - 1)),
                        max(45, min(99, baseline["fuel"]["lpg"] + fuel_variation[day_index] + 1)),
                        max(28, min(95, baseline["fuel"]["ev"] + day_index * 0.8 - zone_index * 0.3)),
                    ),
                )

        cursor.execute(
            """
            insert into upload_history (dataset_name, rows_uploaded, uploaded_by)
            values
              ('aqi_data', ?, 'system-seed'),
              ('water_data', ?, 'system-seed'),
              ('accident_data', ?, 'system-seed'),
              ('resource_data', ?, 'system-seed'),
              ('fuel_data', ?, 'system-seed')
            """,
            (
                len(ZONE_ORDER) * DEFAULT_DAYS,
                len(ZONE_ORDER) * DEFAULT_DAYS,
                len(ZONE_ORDER) * DEFAULT_DAYS,
                len(ZONE_ORDER) * DEFAULT_DAYS,
                len(ZONE_ORDER) * DEFAULT_DAYS,
            ),
        )


def init_database() -> None:
    create_tables()
    seed_demo_data()

