import json
import urllib.request

url = 'http://127.0.0.1:8000/admin/upload'
headers = {'Content-Type': 'application/json'}
body = json.dumps({
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
})
req = urllib.request.Request(url, data=body.encode('utf-8'), headers=headers, method='POST')
with urllib.request.urlopen(req, timeout=15) as resp:
    print('Status:', resp.status)
    print(resp.read().decode('utf-8'))
