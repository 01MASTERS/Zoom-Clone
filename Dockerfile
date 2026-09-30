# Multi-stage Dockerfile for Zoom Clone full-stack application

# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 2: Runtime environment with Python 3.11 and Node.js
FROM python:3.11-slim AS runner
WORKDIR /app

# Install Node.js 20 runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend assets
COPY --from=frontend-builder /frontend/package.json ./frontend/
COPY --from=frontend-builder /frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /frontend/.next ./frontend/.next
COPY --from=frontend-builder /frontend/public ./frontend/public

# Expose Next.js (3000) and FastAPI (8000)
EXPOSE 3000 8000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Launch FastAPI and Next.js concurrently
CMD ["sh", "-c", "cd /app/backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 & cd /app/frontend && npm start"]
