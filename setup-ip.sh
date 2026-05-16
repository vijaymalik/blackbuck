#!/bin/bash

# setup-ip.sh - Dynamically configure IP and start Docker
# Usage: ./setup-ip.sh [optional_ip]

# 1. Get the local IP address
if [ -z "$1" ]; then
    # Try to detect IP (works on Linux/WSL)
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$LOCAL_IP" ]; then
        echo "Could not detect IP. Please provide it as an argument: ./setup-ip.sh 192.168.1.10"
        exit 1
    fi
else
    LOCAL_IP=$1
fi

echo "🚀 Setting up project with IP: $LOCAL_IP"

# 2. Update .env (Laravel)
if [ -f .env ]; then
    echo "Updating .env..."
    # Replace APP_URL while preserving other parts
    sed -i "s|APP_URL=.*|APP_URL=http://$LOCAL_IP:8002|g" .env
else
    echo "⚠️ .env file not found! Copying from .env.example..."
    cp .env.example .env
    sed -i "s|APP_URL=.*|APP_URL=http://$LOCAL_IP:8002|g" .env
fi

# 3. Update driver-app API config
API_FILE="driver-app/src/api/index.js"
if [ -f "$API_FILE" ]; then
    echo "Updating Driver App API config..."
    # Use | as delimiter for sed to handle slashes in URLs
    sed -i "s|const API_BASE_URL = .*|const API_BASE_URL = 'http://$LOCAL_IP:8002/api/v1';|g" "$API_FILE"
else
    echo "⚠️ $API_FILE not found!"
fi

# 3.5 Update admin-dashboard API config
ADMIN_ENV="admin-dashboard/.env"
if [ -f "$ADMIN_ENV" ]; then
    echo "Updating Admin Dashboard API config..."
    sed -i "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://$LOCAL_IP:8002/api/v1/admin|g" "$ADMIN_ENV"
else
    echo "⚠️ $ADMIN_ENV not found! Copying from .env.example if exists..."
    if [ -f "admin-dashboard/.env.example" ]; then
        cp admin-dashboard/.env.example "$ADMIN_ENV"
        sed -i "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://$LOCAL_IP:8002/api/v1/admin|g" "$ADMIN_ENV"
    else
        echo "VITE_API_BASE_URL=http://$LOCAL_IP:8002/api/v1/admin" > "$ADMIN_ENV"
    fi
fi

# 4. Start Docker
echo "📦 Starting Docker containers..."

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_CMD="docker compose"
else
    echo "❌ Error: Neither 'docker-compose' nor 'docker compose' found!"
    exit 1
fi

$DOCKER_CMD down
$DOCKER_CMD up -d

echo "✅ Done! Project is running at http://$LOCAL_IP:8002"
echo "📱 Mobile API is set to http://$LOCAL_IP:8002/api/v1"
