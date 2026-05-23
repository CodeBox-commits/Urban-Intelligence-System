import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient
from backend import services as svc
from backend.app import app

client = TestClient(app)
print('MODEL_ARTIFACTS at startup:', {k: bool(v) for k, v in svc.MODEL_ARTIFACTS.items()})
response = client.post(
    '/predict/resource',
    json={
        'power_usage': 120,
        'water_usage': 50,
        'gas_usage': 25,
        'temperature': 29,
        'humidity': 55,
    },
)
print('status', response.status_code)
print(response.text)
print('json', response.json() if response.content else None)
