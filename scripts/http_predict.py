import json
import urllib.request

url = 'http://127.0.0.1:8000/predict/resource'
headers = {'Content-Type': 'application/json'}
body = json.dumps({
    'power_usage': 120,
    'water_usage': 50,
    'gas_usage': 25,
    'temperature': 29,
    'humidity': 55,
})
req = urllib.request.Request(url, data=body.encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print('Status:', resp.status)
        print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as exc:
    print('HTTP status:', exc.code)
    try:
        print(exc.read().decode('utf-8'))
    except Exception:
        pass
except Exception as exc:
    print('HTTP error:', type(exc).__name__, exc)
