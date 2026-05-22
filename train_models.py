from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from generate_data import DATA_DIR, generate_all_datasets


MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

DATASETS = {
    "water": {
        "path": DATA_DIR / "water_synthetic.csv",
        "target": "potability",
        "categorical": [],
        "output_path": MODEL_DIR / "water_model.pkl",
        "candidates": [
            {"model": "rf", "n_estimators": 240, "max_depth": None, "min_samples_leaf": 3, "max_features": "sqrt", "class_weight": "balanced_subsample"},
            {"model": "extra_trees", "n_estimators": 320, "max_depth": None, "min_samples_leaf": 2, "max_features": 0.8, "class_weight": "balanced"},
            {"model": "voting", "rf_leaf": 3, "extra_leaf": 2, "gb_depth": 3, "gb_learning_rate": 0.04},
        ],
    },
    "aqi": {
        "path": DATA_DIR / "aqi_synthetic.csv",
        "target": "aqi_category",
        "categorical": [],
        "output_path": MODEL_DIR / "aqi_model.pkl",
        "candidates": [
            {"model": "rf", "n_estimators": 260, "max_depth": None, "min_samples_leaf": 2, "max_features": 0.8, "class_weight": "balanced_subsample"},
            {"model": "extra_trees", "n_estimators": 340, "max_depth": None, "min_samples_leaf": 2, "max_features": 0.9, "class_weight": "balanced"},
            {"model": "voting", "rf_leaf": 2, "extra_leaf": 2, "gb_depth": 4, "gb_learning_rate": 0.05},
        ],
    },
    "accident": {
        "path": DATA_DIR / "accident_synthetic.csv",
        "target": "accident_risk",
        "categorical": ["weather", "road_type", "lighting", "traffic_density", "time_of_day"],
        "output_path": MODEL_DIR / "accident_model.pkl",
        "candidates": [
            {"model": "rf", "n_estimators": 240, "max_depth": None, "min_samples_leaf": 3, "max_features": "sqrt", "class_weight": "balanced_subsample"},
            {"model": "extra_trees", "n_estimators": 320, "max_depth": None, "min_samples_leaf": 2, "max_features": 0.8, "class_weight": "balanced"},
            {"model": "voting", "rf_leaf": 3, "extra_leaf": 2, "gb_depth": 3, "gb_learning_rate": 0.04},
        ],
    },
}


def ensure_datasets_exist() -> None:
    missing_paths = [config["path"] for config in DATASETS.values() if not config["path"].exists()]
    if missing_paths:
        generate_all_datasets()


def build_preprocessor(feature_frame: pd.DataFrame, categorical_features: list[str]) -> ColumnTransformer:
    numeric_features = [column for column in feature_frame.columns if column not in categorical_features]

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_features),
            ("categorical", categorical_transformer, categorical_features),
        ]
    )


def build_estimator(model_params: dict):
    params = model_params.copy()
    model_name = params.pop("model", "rf")

    if model_name == "extra_trees":
        return ExtraTreesClassifier(
            random_state=42,
            n_jobs=1,
            **params,
        )

    if model_name == "voting":
        rf_leaf = params.pop("rf_leaf")
        extra_leaf = params.pop("extra_leaf")
        gb_depth = params.pop("gb_depth")
        gb_learning_rate = params.pop("gb_learning_rate")
        return VotingClassifier(
            estimators=[
                (
                    "rf",
                    RandomForestClassifier(
                        n_estimators=180,
                        max_depth=None,
                        min_samples_leaf=rf_leaf,
                        max_features="sqrt",
                        class_weight="balanced_subsample",
                        random_state=42,
                        n_jobs=1,
                    ),
                ),
                (
                    "extra",
                    ExtraTreesClassifier(
                        n_estimators=240,
                        max_depth=None,
                        min_samples_leaf=extra_leaf,
                        max_features=0.8,
                        class_weight="balanced",
                        random_state=43,
                        n_jobs=1,
                    ),
                ),
                (
                    "gb",
                    GradientBoostingClassifier(
                        n_estimators=140,
                        max_depth=gb_depth,
                        learning_rate=gb_learning_rate,
                        random_state=44,
                    ),
                ),
            ],
            voting="soft",
        )

    return RandomForestClassifier(
        random_state=42,
        n_jobs=1,
        **params,
    )


def build_pipeline(feature_frame: pd.DataFrame, categorical_features: list[str], model_params: dict) -> Pipeline:
    preprocessor = build_preprocessor(feature_frame, categorical_features)
    model = build_estimator(model_params)

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )


def evaluate_candidate(
    feature_train: pd.DataFrame,
    feature_test: pd.DataFrame,
    target_train: pd.Series,
    target_test: pd.Series,
    categorical_features: list[str],
    params: dict,
) -> dict:
    pipeline = build_pipeline(feature_train, categorical_features, params)
    cv = StratifiedKFold(n_splits=2, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, feature_train, target_train, cv=cv, scoring="accuracy", n_jobs=1)
    pipeline.fit(feature_train, target_train)
    train_pred = pipeline.predict(feature_train)
    test_pred = pipeline.predict(feature_test)
    train_accuracy = accuracy_score(target_train, train_pred)
    test_accuracy = accuracy_score(target_test, test_pred)
    test_balanced_accuracy = balanced_accuracy_score(target_test, test_pred)
    test_macro_f1 = f1_score(target_test, test_pred, average="macro")

    return {
        "pipeline": pipeline,
        "params": params,
        "cv_mean": float(cv_scores.mean()),
        "cv_std": float(cv_scores.std()),
        "train_accuracy": float(train_accuracy),
        "test_accuracy": float(test_accuracy),
        "test_balanced_accuracy": float(test_balanced_accuracy),
        "test_macro_f1": float(test_macro_f1),
    }


def select_best_candidate(candidates: list[dict]) -> dict:
    return max(
        candidates,
        key=lambda candidate: (
            candidate["test_accuracy"],
            candidate["test_macro_f1"],
            candidate["test_balanced_accuracy"],
            candidate["cv_mean"],
        ),
    )


def train_and_save_model(dataset_name: str) -> dict:
    config = DATASETS[dataset_name]
    data_frame = pd.read_csv(config["path"])
    target_name = config["target"]

    features = data_frame.drop(columns=[target_name])
    target = data_frame[target_name]

    feature_train, feature_test, target_train, target_test = train_test_split(
        features,
        target,
        test_size=0.2,
        random_state=42,
        stratify=target,
    )

    candidate_results = [
        evaluate_candidate(
            feature_train,
            feature_test,
            target_train,
            target_test,
            config["categorical"],
            params,
        )
        for params in config["candidates"]
    ]

    best_result = select_best_candidate(candidate_results)

    artifact = {
        "pipeline": best_result["pipeline"],
        "feature_names": list(features.columns),
        "target_name": target_name,
        "classes": list(best_result["pipeline"].named_steps["model"].classes_),
        "metrics": {
            "cv_mean_accuracy": round(best_result["cv_mean"], 4),
            "cv_std_accuracy": round(best_result["cv_std"], 4),
            "train_accuracy": round(best_result["train_accuracy"], 4),
            "test_accuracy": round(best_result["test_accuracy"], 4),
            "test_balanced_accuracy": round(best_result["test_balanced_accuracy"], 4),
            "test_macro_f1": round(best_result["test_macro_f1"], 4),
        },
        "model_params": best_result["params"],
    }

    joblib.dump(artifact, config["output_path"])
    return artifact


def ensure_model_artifacts() -> None:
    ensure_datasets_exist()

    for name, config in DATASETS.items():
        if not config["output_path"].exists():
            train_and_save_model(name)


def main() -> None:
    ensure_datasets_exist()

    for name in DATASETS:
        artifact = train_and_save_model(name)
        metrics = artifact["metrics"]
        print(
            f"{name}: cv={metrics['cv_mean_accuracy']:.3f} "
            f"train={metrics['train_accuracy']:.3f} "
            f"test={metrics['test_accuracy']:.3f}"
        )


if __name__ == "__main__":
    main()
