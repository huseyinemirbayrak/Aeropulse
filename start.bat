@echo off
title AeroPulse Enterprise Platform Launcher
cd /d "%~dp0"
echo ============================================================
echo      AEROPULSE ENTERPRISE AVIATION PLATFORM
echo ============================================================
echo   Backend API  : http://localhost:5253 (Swagger: /swagger)
echo   Frontend Web : http://localhost:4200
echo ============================================================
node start.js
pause
