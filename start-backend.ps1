# Quick Start Script for InternCompass Backend
# This script checks for required services and provides guidance

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "InternCompass Backend Setup Check" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking for Docker..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    Write-Host "✅ Docker is installed" -ForegroundColor Green
    Write-Host ""
    
    # Check if Docker is running
    try {
        docker ps | Out-Null
        Write-Host "✅ Docker is running" -ForegroundColor Green
        Write-Host ""
        
        # Check if services are running
        Write-Host "Checking Docker services..." -ForegroundColor Yellow
        $postgresRunning = docker ps --filter "name=postgres" --format "{{.Names}}" | Select-String "postgres"
        $redisRunning = docker ps --filter "name=redis" --format "{{.Names}}" | Select-String "redis"
        $minioRunning = docker ps --filter "name=minio" --format "{{.Names}}" | Select-String "minio"
        
        if ($postgresRunning -and $redisRunning -and $minioRunning) {
            Write-Host "✅ All services are running!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Starting the backend..." -ForegroundColor Cyan
            npm run dev
        } else {
            Write-Host "⚠️  Some services are not running" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Starting services with docker-compose..." -ForegroundColor Cyan
            docker-compose up -d postgres redis minio
            
            Write-Host ""
            Write-Host "Waiting for services to be ready (30 seconds)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
            
            Write-Host ""
            Write-Host "Services should now be running. You can check with:" -ForegroundColor Cyan
            Write-Host "  docker-compose ps" -ForegroundColor White
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "1. Create MinIO bucket at http://localhost:9001" -ForegroundColor White
            Write-Host "   Login: minioadmin / minioadmin" -ForegroundColor White
            Write-Host "   Create bucket: interncompass" -ForegroundColor White
            Write-Host ""
            Write-Host "2. Run database migrations:" -ForegroundColor White
            Write-Host "   npm run db:migrate" -ForegroundColor White
            Write-Host ""
            Write-Host "3. Start the backend:" -ForegroundColor White
            Write-Host "   npm run dev" -ForegroundColor White
        }
    } catch {
        Write-Host "❌ Docker is not running" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host ""
    Write-Host "Or see DEBUGGING_GUIDE.md for manual installation instructions." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For more information, see DEBUGGING_GUIDE.md" -ForegroundColor Cyan
