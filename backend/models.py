from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


def make_uuid() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=make_uuid)
    email = Column(String(255), unique=True, nullable=False)
    role = Column(String(32), nullable=False, default="user")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WaterQualityData(Base):
    __tablename__ = "water_quality_data"

    id = Column(String(36), primary_key=True, default=make_uuid)
    country = Column(String(128), nullable=False, default="India")
    state = Column(String(128), nullable=False)
    district = Column(String(128), nullable=True)
    city = Column(String(128), nullable=True)
    zone = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    ph = Column(Float, nullable=False)
    turbidity = Column(Float, nullable=False)
    solids = Column(Float, nullable=False)
    chloramines = Column(Float, nullable=False)
    sulfate = Column(Float, nullable=False)
    conductivity = Column(Float, nullable=False)
    organic_carbon = Column(Float, nullable=False)
    hardness = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    dissolved_oxygen = Column(Float, nullable=False)
    potability = Column(Integer, nullable=False)
    risk_level = Column(String(32), nullable=False)


class AirQualityData(Base):
    __tablename__ = "air_quality_data"

    id = Column(String(36), primary_key=True, default=make_uuid)
    country = Column(String(128), nullable=False, default="India")
    state = Column(String(128), nullable=False)
    district = Column(String(128), nullable=True)
    city = Column(String(128), nullable=True)
    zone = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    pm25 = Column(Float, nullable=False)
    pm10 = Column(Float, nullable=False)
    no2 = Column(Float, nullable=False)
    so2 = Column(Float, nullable=False)
    co = Column(Float, nullable=False)
    o3 = Column(Float, nullable=False)
    nh3 = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    wind_speed = Column(Float, nullable=False)
    aqi = Column(Integer, nullable=False)
    aqi_category = Column(String(64), nullable=False)


class AccidentData(Base):
    __tablename__ = "accident_data"

    id = Column(String(36), primary_key=True, default=make_uuid)
    country = Column(String(128), nullable=False, default="India")
    state = Column(String(128), nullable=False)
    district = Column(String(128), nullable=True)
    city = Column(String(128), nullable=True)
    zone = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    date = Column(Date, nullable=False)
    accident_count = Column(Integer, nullable=False)
    severity = Column(String(64), nullable=False)
    risk_level = Column(String(32), nullable=False)


class ResourceUsageData(Base):
    __tablename__ = "resource_usage_data"

    id = Column(String(36), primary_key=True, default=make_uuid)
    country = Column(String(128), nullable=False, default="India")
    state = Column(String(128), nullable=False)
    district = Column(String(128), nullable=True)
    city = Column(String(128), nullable=True)
    zone = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    power_usage = Column(Float, nullable=False)
    water_usage = Column(Float, nullable=False)
    gas_usage = Column(Float, nullable=False)
    usage_score = Column(Float, nullable=False)
    anomaly = Column(Boolean, nullable=False, default=False)
    risk_level = Column(String(32), nullable=False)


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id = Column(String(36), primary_key=True, default=make_uuid)
    model_name = Column(String(64), nullable=False)
    version = Column(String(64), nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    train_accuracy = Column(Float, nullable=False)
    test_accuracy = Column(Float, nullable=False)
    cv_mean_accuracy = Column(Float, nullable=False)
    cv_std_accuracy = Column(Float, nullable=False)
    model_params = Column(JSON, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=make_uuid)
    zone = Column(String(128), nullable=False)
    state = Column(String(128), nullable=False)
    level = Column(String(32), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="Open")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    details = Column(JSON, nullable=True)


class UploadedDataset(Base):
    __tablename__ = "uploaded_datasets"

    id = Column(String(36), primary_key=True, default=make_uuid)
    dataset_type = Column(String(64), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    record_count = Column(Integer, nullable=False)
    status = Column(String(32), nullable=False)
    details = Column(JSON, nullable=True)


class PredictionLog(Base):
    __tablename__ = "predictions_log"

    id = Column(String(36), primary_key=True, default=make_uuid)
    model_name = Column(String(64), nullable=False)
    input_data = Column(JSON, nullable=False)
    prediction = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
