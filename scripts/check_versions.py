import importlib
packages = ['sqlalchemy', 'pymysql', 'pydantic_settings', 'httpx', 'email_validator']
for pkg in packages:
    try:
        m = importlib.import_module(pkg)
        print(pkg, getattr(m, '__version__', 'unknown'))
    except Exception as exc:
        print(pkg, 'missing', exc)
