# ---- Analog Matcher: API (FastAPI) + frontend estático en un solo contenedor ----
# Pensado para Google Cloud Run.
FROM python:3.12-slim

WORKDIR /app

# Dependencias primero (mejor cache de capas)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código: main.py, y el frontend en ./static
COPY . .

# Cloud Run inyecta la variable PORT (por defecto 8080). Hay que escucharla.
ENV PORT=8080
EXPOSE 8080

# exec + shell form para que ${PORT} se expanda
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
