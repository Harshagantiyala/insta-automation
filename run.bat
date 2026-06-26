@echo off
title InstaFlow Multi-Runner
cls
echo ========================================================
echo                 InstaFlow System Runner
echo ========================================================
echo.
echo Please select how you want to run the project:
echo   [1] Run using Docker Compose (Easiest, starts all services)
echo   [2] Run locally using Node.js processes (Terminal per service)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" goto DOCKER
if "%choice%"=="2" goto LOCAL
echo Invalid choice. Exiting...
pause
exit

:DOCKER
echo Starting Docker Compose...
cd /d "%~dp0instaflow"
docker compose up --build
goto END

:LOCAL
echo Setting up local environment...
cd /d "%~dp0"

:: 1. Copy backend env if missing
if not exist "instaflow\backend\.env" (
    echo [Backend] Creating .env from .env.example...
    copy "instaflow\backend\.env.example" "instaflow\backend\.env"
    echo [Backend] Generating random secure keys for JWT and Token Encryption...
    powershell -Command "$b1=New-Object Byte[] 32; [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($b1); $key=[System.BitConverter]::ToString($b1).Replace('-','').ToLower(); $b2=New-Object Byte[] 16; [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($b2); $jwt=[System.BitConverter]::ToString($b2).Replace('-','').ToLower(); (Get-Content instaflow\backend\.env) -replace 'replace_with_64_char_hex_string', $key -replace 'replace_with_a_long_random_string', $jwt | Set-Content instaflow\backend\.env"
)

:: 2. Copy frontend env if missing
if not exist "instaflow\frontend\.env" (
    echo [Frontend] Creating .env from .env.example...
    copy "instaflow\frontend\.env.example" "instaflow\frontend\.env"
)

:: 3. Run npm install for backend if node_modules doesn't exist
if not exist "instaflow\backend\node_modules\" (
    echo [Backend] node_modules not found. Installing dependencies...
    cd /d "%~dp0instaflow\backend"
    call npm install
)

:: 4. Run npm install for frontend if node_modules doesn't exist
if not exist "instaflow\frontend\node_modules\" (
    echo [Frontend] node_modules not found. Installing dependencies...
    cd /d "%~dp0instaflow\frontend"
    call npm install
)

cd /d "%~dp0"

echo.
echo Launching InstaFlow processes...
echo.

:: Start the 4 windows
echo Starting Backend API Server...
start "InstaFlow Backend API" /D "%~dp0instaflow\backend" cmd /k "npm run dev"

echo Starting DM Queue Worker...
start "InstaFlow DM Worker" /D "%~dp0instaflow\backend" cmd /k "npm run worker:dev"

echo Starting Fallback Queue Worker...
start "InstaFlow Fallback Worker" /D "%~dp0instaflow\backend" cmd /k "npm run worker:fallback:dev"

echo Starting Frontend Dev Server...
start "InstaFlow Frontend" /D "%~dp0instaflow\frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo All processes spawned successfully in separate windows!
echo - API Server: http://localhost:4000
echo - Frontend Dashboard: http://localhost:5173
echo.
echo Keep this window open if you want to close all processes.
echo Press any key to stop all spawned windows and exit.
echo ========================================================
pause

:: Close the cmd windows we started
taskkill /FI "WINDOWTITLE eq InstaFlow Backend API*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq InstaFlow DM Worker*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq InstaFlow Fallback Worker*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq InstaFlow Frontend*" /F >nul 2>&1

:END
exit
