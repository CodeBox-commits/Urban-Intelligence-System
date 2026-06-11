import csv
import os
from datetime import datetime, timedelta
import random

ZONES = ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Mahbubnagar"]

def generate_datasets():
    output_dir = "demo_datasets"
    os.makedirs(output_dir, exist_ok=True)
    
    # Get last 5 days up to today
    today = datetime.utcnow().date()
    dates = [(today - timedelta(days=i)).isoformat() for i in range(5)]
    
    # 1. AQI Demo Data (aqi)
    # Fields: zone, date, aqi
    aqi_path = os.path.join(output_dir, "aqi_demo.csv")
    with open(aqi_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["zone", "date", "aqi"])
        for zone in ZONES:
            for date in dates:
                # Add higher AQI values for a noticeable impact in charts
                aqi_val = random.randint(90, 210)
                writer.writerow([zone, date, aqi_val])
                
    # 2. Water Demo Data (water)
    # Fields: zone, date, ph, turbidity, solids, chloramines, sulfate, conductivity, organic_carbon, hardness, temperature, dissolved_oxygen, potability, water_score, water_quality
    water_path = os.path.join(output_dir, "water_demo.csv")
    with open(water_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "zone", "date", "ph", "turbidity", "solids", "chloramines", "sulfate", 
            "conductivity", "organic_carbon", "hardness", "temperature", "dissolved_oxygen", 
            "potability", "water_score", "water_quality"
        ])
        for zone in ZONES:
            for date in dates:
                ph = round(random.uniform(6.5, 8.5), 2)
                turb = round(random.uniform(1.5, 5.0), 2)
                solids = random.randint(12000, 24000)
                chlor = round(random.uniform(2.0, 5.0), 2)
                sulf = round(random.uniform(200, 350), 2)
                cond = round(random.uniform(300, 500), 2)
                carb = round(random.uniform(8.0, 16.0), 2)
                hard = round(random.uniform(150, 250), 2)
                temp = round(random.uniform(22.0, 28.0), 2)
                ox = round(random.uniform(6.5, 9.5), 2)
                score = random.randint(60, 95)
                potability = 1 if score >= 80 else 0
                quality = "Potable" if score >= 80 else "Needs Review" if score >= 65 else "Not Potable"
                writer.writerow([
                    zone, date, ph, turb, solids, chlor, sulf, 
                    cond, carb, hard, temp, ox, potability, score, quality
                ])
                
    # 3. Accident Demo Data (accident)
    # Fields: zone, date, accident_count, severity, risk_score
    accident_path = os.path.join(output_dir, "accident_demo.csv")
    with open(accident_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["zone", "date", "accident_count", "severity", "risk_score"])
        for zone in ZONES:
            for date in dates:
                count = random.randint(1, 12)
                severity = "High" if count >= 8 else "Medium" if count >= 4 else "Low"
                risk = round(random.uniform(20.0, 95.0), 1)
                writer.writerow([zone, date, count, severity, risk])
                
    # 4. Resource Demo Data (resource)
    # Fields: zone, date, utilization, electricity_load, sanitation_score, drainage_score
    resource_path = os.path.join(output_dir, "resource_demo.csv")
    with open(resource_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["zone", "date", "utilization", "electricity_load", "sanitation_score", "drainage_score"])
        for zone in ZONES:
            for date in dates:
                util = round(random.uniform(60.0, 92.0), 1)
                elec = round(util + random.uniform(-4, 6), 1)
                san = round(util + random.uniform(-5, 8), 1)
                drain = round(util + random.uniform(-6, 4), 1)
                writer.writerow([zone, date, util, elec, san, drain])
                
    # 5. Fuel Demo Data (fuel)
    # Fields: zone, date, petrol_availability, diesel_availability, lpg_availability, ev_utilization
    fuel_path = os.path.join(output_dir, "fuel_demo.csv")
    with open(fuel_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["zone", "date", "petrol_availability", "diesel_availability", "lpg_availability", "ev_utilization"])
        for zone in ZONES:
            for date in dates:
                petrol = round(random.uniform(55.0, 95.0), 1)
                diesel = round(random.uniform(50.0, 90.0), 1)
                lpg = round(random.uniform(65.0, 98.0), 1)
                ev = round(random.uniform(30.0, 85.0), 1)
                writer.writerow([zone, date, petrol, diesel, lpg, ev])
                
    print(f"Demo datasets generated successfully in '{output_dir}/' folder:")
    print(f"- AQI: {aqi_path}")
    print(f"- Water: {water_path}")
    print(f"- Accident: {accident_path}")
    print(f"- Resource: {resource_path}")
    print(f"- Fuel: {fuel_path}")

if __name__ == "__main__":
    generate_datasets()
