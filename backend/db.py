from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings


default_engine = create_engine(str(settings.database_url), future=True)
SessionLocal = sessionmaker(bind=default_engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    from .models import Base

    Base.metadata.create_all(bind=default_engine)


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()