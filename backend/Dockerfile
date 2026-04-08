# Render-compatible Dockerfile for FastAPI backend

# Use Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (for better Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render sets PORT environment variable)
EXPOSE 8000

# Run the application with Gunicorn (production server)
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
