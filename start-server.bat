@echo off
REM Quick Start Script for Poda Bites Payment Server
REM This script starts the Node.js server and opens the website

echo.
echo ========================================
echo   Poda Bites Payment Server
echo ========================================
echo.

REM Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo.
    echo Install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies (first time)...
    call npm install
    echo.
)

REM Start the server
echo 🚀 Starting payment server...
echo.
timeout /t 2 /nobreak
start http://localhost:3000
node server.js

pause
