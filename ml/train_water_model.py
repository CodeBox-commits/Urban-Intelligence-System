"""Train a water potability classifier from public CSV dataset.

Dataset mirrors (same schema): water_potability.csv
Task: binary classification for Potability (0/1)
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
MODELS = ROOT / "models"
MODELS.mkdir(parents=True, exist_ok=True)

DATASET_URLS = [
    "https://huggingface.co/datasets/kheejay88/water_potability/resolve/main/water_potability.csv",
    "https://huggingface.co/datasets/DarkNeuronAI/water-potability-3k/resolve/main/water_potability.csv",
]


def load_dataset() -> pd.DataFrame:
    last_error = None
    for url in DATASET_URLS:
        try:
            resp = requests.get(url, timeout=60)
            resp.raise_for_status()
            frame = pd.read_csv(pd.io.common.BytesIO(resp.content))
            if "Potability" not in frame.columns:
                raise RuntimeError("Expected Potability column not found")
            print(f"Loaded water dataset from: {url}")
            return frame
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue
    raise RuntimeError(f"Failed to download water dataset: {last_error}")


def main() -> None:
    df = load_dataset()
    y = pd.to_numeric(df["Potability"], errors="coerce")
    X = df.drop(columns=["Potability"], errors="ignore")

    X = X.select_dtypes(include=[np.number])
    X = X.loc[y.notna()]
    y = y.loc[y.notna()].astype(int)

    numeric_features = X.columns.tolist()
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))]),
                numeric_features,
            )
        ]
    )

    model = Pipeline(
        steps=[
            ("prep", preprocessor),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=400,
                    random_state=42,
                    n_jobs=-1,
                    min_samples_leaf=2,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]
    metrics = {
        "weighted_f1": float(f1_score(y_test, pred, average="weighted")),
        "macro_f1": float(f1_score(y_test, pred, average="macro")),
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "target": "Potability",
        "report": classification_report(y_test, pred, output_dict=True),
    }

    model_path = MODELS / "water_potability_classifier.joblib"
    metrics_path = MODELS / "water_metrics.json"
    joblib.dump(model, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2))

    print("Saved:", model_path)
    print("Saved:", metrics_path)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
