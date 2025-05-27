@echo off
echo ====================================================
echo  Stopping Customer Analytics System
echo ====================================================

echo [1/2] Stopping Docker containers...
docker-compose down

echo.
echo [2/2] Stopping camera host stream...
taskkill /f /im python.exe /fi "WINDOWTITLE eq Camera Stream"

echo.
echo ====================================================
echo  System stopped successfully!
echo ====================================================
