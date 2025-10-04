#!/bin/bash

# InternCompass Development Setup Script
# This script sets up the development environment for InternCompass

set -e

echo "🚀 Setting up InternCompass development environment..."

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking prerequisites..."
check_command "node"
check_command "npm"
check_command "docker"
check_command "docker-compose"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version $(node -v) is compatible"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Start services with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d postgres redis minio

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service health..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Some services failed to start"
    docker-compose logs
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

echo "✅ Development environment setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env file with your Gemini API key"
echo "2. Start the API server: npm run dev"
echo "3. Start the worker (in another terminal): npm run worker"
echo "4. Visit http://localhost:3001/api-docs for API documentation"
echo "5. Visit http://localhost:9001 for MinIO console (minioadmin/minioadmin)"
echo ""
echo "🎉 Happy coding!"
