import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT)

from backend import services

print('Loading model artifacts...')
services.load_model_artifacts()
print('Loaded keys:', [k for k, v in services.MODEL_ARTIFACTS.items() if v is not None])
print('Resource artifact present:', services.MODEL_ARTIFACTS.get('resource') is not None)
try:
    result = services._predict('resource', {
        'power_usage': 120,
        'water_usage': 50,
        'gas_usage': 25,
        'temperature': 29,
        'humidity': 55,
    })
    print('Prediction result:', result)
except Exception as exc:
    print('Prediction error:', type(exc).__name__, exc)
