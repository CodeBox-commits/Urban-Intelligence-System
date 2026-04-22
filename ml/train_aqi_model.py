"""Train AQI-related model from UCI Beijing PM2.5 dataset.

Dataset: UCI Beijing PM2.5 (id=381)
Task: predict PM2.5 concentration (regression).
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from ucimlrepo import fetch_ucirepo

ROOT = Path(__file__).resolve().parent
MODELS = ROOT / "models"
MODELS.mkdir(parents=True, exist_ok=True)


def main() -> None:
    ds = fetch_ucirepo(id=381)
    X = ds.data.features.copy()
    y = ds.data.targets.copy()

    if isinstance(y, pd.DataFrame):
        target_col = "PM2.5" if "PM2.5" in y.columns else y.columns[0]
        y = y[target_col]

    frame = X.copy()
    frame["target"] = y
    frame = frame.replace("NA", np.nan).dropna(subset=["target"])

    y = pd.to_numeric(frame.pop("target"), errors="coerce")
    frame = frame.loc[y.notna()]
    y = y.loc[y.notna()]

    numeric_cols = frame.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [c for c in frame.columns if c not in numeric_cols]

    pre = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric_cols),
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("ohe", OneHotEncoder(handle_unknown="ignore")),
                ]),
                categorical_cols,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("prep", pre),
            ("model", HistGradientBoostingRegressor(random_state=42, max_depth=8, learning_rate=0.05)),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(frame, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    metrics = {
        "mae": float(mean_absolute_error(y_test, pred)),
        "r2": float(r2_score(y_test, pred)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "target": "PM2.5",
    }

    model_path = MODELS / "aqi_pm25_regressor.joblib"
    metrics_path = MODELS / "aqi_metrics.json"
    joblib.dump(model, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2))

    print("Saved:", model_path)
    print("Saved:", metrics_path)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
