import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

endpoints = [
    ('GET', '/analytics/aqi', {'state': 'Telangana', 'zone': 'All Telangana'}),
    ('POST', '/predict/resource', {
        'power_usage': 120,
        'water_usage': 50,
        'gas_usage': 25,
        'temperature': 29,
        'humidity': 55,
    }),
    ('POST', '/predict/water', {
        'ph': 7.2,
        'turbidity': 3.1,
        'solids': 14500,
        'chloramines': 3.2,
        'sulfate': 250.0,
        'conductivity': 390.0,
        'organic_carbon': 10.5,
        'hardness': 160.0,
        'temperature': 26.0,
        'dissolved_oxygen': 7.8,
    }),
    ('POST', '/predict/aqi', {
        'pm25': 35,
        'pm10': 60,
        'no2': 20,
        'so2': 8,
        'co': 0.6,
        'o3': 25,
        'nh3': 10,
        'temperature': 28,
        'humidity': 60,
        'wind_speed': 3.2,
    }),
    ('POST', '/predict/accident', {
        'weather': 'Clear',
        'road_type': 'Urban',
        'lighting': 'Day',
        'traffic_density': 'High',
        'time_of_day': 'Morning',
        'accident_count': 5,
    }),
    ('POST', '/admin/upload', {
        'dataset_type': 'resource_data',
        'rows': [
            {
                'state': 'Telangana',
                'zone': 'Hyderabad',
                'power_usage': 110,
                'water_usage': 45,
                'gas_usage': 22,
                'temperature': 28,
                'humidity': 52,
                'usage_score': 85,
                'anomaly': 0,
                'risk_level': 'Medium',
            }
        ],
    }),
]

for method, path, payload in endpoints:
    if method == 'GET':
        response = client.get(path, params=payload)
    else:
        response = client.post(path, json=payload)
    print(f'{method} {path} -> {response.status_code}')
    print(response.text)
    print('-' * 80)
