import requests

BASE = 'http://127.0.0.1:8000'

endpoints = ['/analytics/resources', '/analytics/aqi', '/analytics/accidents', '/dashboard']

for ep in endpoints:
    try:
        r = requests.get(BASE + ep, timeout=5)
        print(ep, r.status_code)
        print(r.json())
    except Exception as e:
        print(ep, 'ERROR', e)
