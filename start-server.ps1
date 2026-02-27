# PowerShell Script to Start Poda Bites Payment Server
# Right-click > Run with PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Poda Bites Payment Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node is installed
$nodeCheck = node --version 2>$null
if ($null -eq $nodeCheck) {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Install from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Node.js found: $nodeCheck" -ForegroundColor Green
Write-Host ""

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "🚀 Starting payment server on http://localhost:3000" -ForegroundColor Green
Write-Host ""

# Start browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# Start server
node server.js

Read-Host "Press Enter to close"
