# Base image with Python 3.11 slim
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install essential system dependencies (OpenMP for ML operations, curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency requirements first to leverage Docker cache
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code and models
COPY . /app/

# Create required directories for uploads and heatmaps
RUN mkdir -p /app/uploads/heatmaps

# Expose default port (documentary)
EXPOSE 5002

# Run with Gunicorn using 1 worker (RAM-optimized for free tier) and dynamic $PORT binding
CMD ["sh", "-c", "gunicorn -w 1 -b 0.0.0.0:${PORT:-5002} --timeout 120 api.flask_api:app"]
