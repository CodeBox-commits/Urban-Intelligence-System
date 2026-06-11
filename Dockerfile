# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, ml modules, and root entrypoint
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY main.py .

# Pre-train the ML models at build time so they are cached in the image
RUN python -m ml.train_models

# Expose the API port
EXPOSE 8000

# Command to run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
