@echo off
@echo Starting AstroCRM Application...
@echo.
@echo This will open 2 cmd windows - one for backend, one for frontend
@echo Both must be running for the app to work
@echo.
@timeout /t 2

REM Create directories if they don't exist
if not exist "%cd%\backend" (
    @echo Error: backend directory not found!
    @pause
    exit /b 1
)

if not exist "%cd%\frontend" (
    @echo Error: frontend directory not found!
    @pause
    exit /b 1
)

@echo.
@echo [1/2] Starting Backend API (port 3001)...
start cmd /k "cd backend && npm run dev"

@timeout /t 3

@echo [2/2] Starting Frontend UI (port 5173)...
start cmd /k "cd frontend && npm run dev"

@echo.
@echo ================================================================
@echo AstroCRM is starting...
@echo.
@echo Wait 20 seconds for both terminals to show "ready" status
@echo Then open: http://localhost:5173
@echo.
@echo Backend URL:  http://localhost:3001
@echo Frontend URL: http://localhost:5173
@echo Database: astrocrm (PostgreSQL)
@echo.
@echo ================================================================
@pause
