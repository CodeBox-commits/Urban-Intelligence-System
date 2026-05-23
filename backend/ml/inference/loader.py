import joblib
from pathlib import Path
from typing import Any

from ...config import settings

MODEL_CACHE: dict[str, Any] = {}


def load_model(model_name: str) -> Any:
    path = settings.model_dir / f"{model_name}_model.pkl"
    if model_name in MODEL_CACHE:
        return MODEL_CACHE[model_name]
    if not path.exists():
        raise FileNotFoundError(f"Model artifact not found: {path}")
    artifact = joblib.load(path)
    MODEL_CACHE[model_name] = artifact
    return artifact


def predict(model_name: str, input_df) -> tuple[Any, float]:
    artifact = load_model(model_name)
    pipeline = artifact["pipeline"]
    probs = pipeline.predict_proba(input_df)[0]
    pred = pipeline.predict(input_df)[0]
    return pred, float(max(probs))
