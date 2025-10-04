# Backend Health Check Script
Write-Host "=== InternCompass Backend Health Check ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "✗ .env file missing" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Dependencies not installed" -ForegroundColor Red
    Write-Host "  Run: npm install" -ForegroundColor Yellow
    exit 1
}

# Check if dist folder exists (compiled)
if (Test-Path "dist") {
    Write-Host "✓ TypeScript compiled" -ForegroundColor Green
} else {
    Write-Host "✗ TypeScript not compiled" -ForegroundColor Yellow
    Write-Host "  Run: npm run build" -ForegroundColor Yellow
}

# Check database migration files
if (Test-Path "src/db/migrations") {
    $migrationCount = (Get-ChildItem "src/db/migrations/*.sql").Count
    Write-Host "✓ Found $migrationCount database migration files" -ForegroundColor Green
} else {
    Write-Host "✗ Migration files not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Backend code is ready to run!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the backend in development mode:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To start in production mode:" -ForegroundColor Yellow
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Note: Make sure PostgreSQL and Redis are running before starting the backend." -ForegroundColor Yellow
