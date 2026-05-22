"""Train accident severity model using UK DfT open road safety data.

Source page: https://www.gov.uk/government/statistics/road-safety-data
This script auto-discovers the latest 'Collisions' CSV link from the page.
"""

from __future__ import annotations

import io
import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parent
MODELS = ROOT / "models"
MODELS.mkdir(parents=True, exist_ok=True)

ROAD_SAFETY_PAGE = "https://www.gov.uk/government/statistics/road-safety-data"


def find_collisions_csv_url() -> str:
    html = requests.get(ROAD_SAFETY_PAGE, timeout=60).text
    soup = BeautifulSoup(html, "html.parser")
    links = [a.get("href") for a in soup.find_all("a", href=True)]

    candidates = []
    for href in links:
        url = href if href.startswith("http") else f"https://www.gov.uk{href}"
        low = url.lower()
        if "csv" in low and "collision" in low:
            candidates.append(url)

    if not candidates:
        raise RuntimeError("Could not locate a collisions CSV link on GOV.UK page")

    def rank(u: str) -> tuple[int, int]:
        year_match = re.search(r"(20\d{2})", u)
        year = int(year_match.group(1)) if year_match else 0
        provisional_penalty = 1 if "provisional" in u.lower() else 0
        return (year, -provisional_penalty)

    candidates.sort(key=rank, reverse=True)
    return candidates[0]


def load_collisions(csv_url: str) -> pd.DataFrame:
    r = requests.get(csv_url, timeout=120)
    r.raise_for_status()

    content_type = r.headers.get("content-type", "").lower()
    raw = r.content

    if "zip" in content_type or csv_url.lower().endswith(".zip"):
        import zipfile

        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            name = next((n for n in zf.namelist() if n.lower().endswith(".csv")), None)
            if not name:
                raise RuntimeError("ZIP did not contain CSV")
            with zf.open(name) as fp:
                return pd.read_csv(fp, low_memory=False)

    return pd.read_csv(io.BytesIO(raw), low_memory=False)


def main() -> None:
    csv_url = find_collisions_csv_url()
    df = load_collisions(csv_url)

    target_col = "accident_severity" if "accident_severity" in df.columns else "collision_severity"
    if target_col not in df.columns:
        raise RuntimeError("Expected severity column not found (accident_severity/collision_severity)")

    drop_cols = [
        c
        for c in [
            "accident_reference",
            "collision_index",
            "collision_ref_no",
            "location_easting_osgr",
            "location_northing_osgr",
            "longitude",
            "latitude",
            "lsoa_of_accident_location",
            "local_authority_ons_district",
        ]
        if c in df.columns
    ]

    y = df[target_col]
    X = df.drop(columns=[target_col, *drop_cols], errors="ignore")

    keep_cols = [c for c in X.columns if X[c].notna().mean() > 0.6]
    X = X[keep_cols]

    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [c for c in X.columns if c not in numeric_cols]

    pre = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric_cols),
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("ohe", OneHotEncoder(handle_unknown="ignore", min_frequency=20)),
                ]),
                categorical_cols,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("prep", pre),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    random_state=42,
                    n_jobs=-1,
                    class_weight="balanced_subsample",
                    min_samples_leaf=2,
                ),
            ),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    metrics = {
        "weighted_f1": float(f1_score(y_test, pred, average="weighted")),
        "macro_f1": float(f1_score(y_test, pred, average="macro")),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "source_csv": csv_url,
        "classes": sorted(pd.Series(y).dropna().astype(str).unique().tolist()),
        "report": classification_report(y_test, pred, output_dict=True),
    }

    model_path = MODELS / "accident_severity_classifier.joblib"
    metrics_path = MODELS / "accident_metrics.json"
    joblib.dump(model, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2))

    print("Source:", csv_url)
    print("Saved:", model_path)
    print("Saved:", metrics_path)
    print(json.dumps({k: v for k, v in metrics.items() if k != "report"}, indent=2))


if __name__ == "__main__":
    main()
