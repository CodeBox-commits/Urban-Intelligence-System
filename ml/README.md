# ML Training Pipelines

This folder contains reproducible training scripts for three project models:

- `train_water_model.py` (Water quality model)
- `train_aqi_model.py` (AQI-related PM2.5 model)
- `train_accident_model.py` (Accident severity model)

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
```

## Train

```bash
python ml/train_water_model.py
python ml/train_aqi_model.py
python ml/train_accident_model.py
```

## Outputs

Artifacts are saved to `ml/models/`:

- `water_potability_classifier.joblib`
- `aqi_pm25_regressor.joblib`
- `accident_severity_classifier.joblib`
- metrics JSON files for each model

## Data sources

- Water: public `water_potability.csv` mirrors (Hugging Face)
- AQI: UCI Beijing Multi-Site Air Quality dataset (id `501`)
- Accident: UK Department for Transport road safety open data page (latest collisions CSV discovered from GOV.UK)
