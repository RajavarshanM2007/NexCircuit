#!/usr/bin/env bash
# ============================================================
# Deploy VIT ELECTRONICS on Amazon EC2 & AWS RDS
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "=================================================="
echo "🚀 Deploying VIT ELECTRONICS on Amazon AWS"
echo "=================================================="

# Check for .env file
if [ ! -f .env ]; then
  echo "⚠️ .env file not found at root. Creating from .env.example..."
  cp .env.example .env
fi

# Ensure Docker is running
if ! systemctl is-active --quiet docker; then
  echo "Starting Docker service..."
  sudo systemctl start docker
fi

echo "📦 Building and starting VIT ELECTRONICS containers (Redis, Migrations, Backend, Frontend)..."
docker compose --env-file .env -f infrastructure/docker-compose.prod.yml up -d --build

echo "⏳ Waiting for backend health check..."
for i in {1..30}; do
  if curl -sf http://localhost:3001/health >/dev/null; then
    echo "✅ Backend API is healthy!"
    break
  fi
  echo "Waiting for API ($i/30)..."
  sleep 3
done

echo "🌱 Seeding AWS RDS PostgreSQL database with VIT ELECTRONICS admin & initial store config..."
docker compose --env-file .env -f infrastructure/docker-compose.prod.yml exec -T backend node prisma/seed.js || true

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || echo "localhost")

echo "=================================================="
echo "🎉 VIT ELECTRONICS Deployment complete!"
echo "  Frontend Store: http://${PUBLIC_IP}:3000"
echo "  Admin Portal:   http://${PUBLIC_IP}:3000/admin"
echo "  Backend API:    http://${PUBLIC_IP}:3001"
echo "  Admin Login:    admin@vitelectronics.com / Admin@123"
echo "=================================================="
