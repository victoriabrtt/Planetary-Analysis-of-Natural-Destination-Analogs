# Analog Matcher — API (FastAPI) + front estático (Vite) en un solo contenedor para Cloud Run.
#   docker build -t analog-matcher .
#   docker run -p 8080:8080 analog-matcher
# Requiere backend/data/index/*.npz ya generados (python -m precompute.build_index).

# ── Etapa 1: build del front ──
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_MODE=real
RUN npm run build

# ── Etapa 2: API ──
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080 STATIC_DIR=/app/static
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY backend/data/index ./data/index
COPY --from=web /web/dist ./static
RUN useradd -r -u 10001 app && chown -R app /app
USER app
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
