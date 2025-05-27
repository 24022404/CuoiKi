@echo off
echo ====================================================
echo  Customer Analytics System - Docker Setup
echo ====================================================
echo.

echo [1/4] Installing Python requirements for camera host stream...
pip install -r requirements-host.txt

echo.
echo [2/4] Starting camera host stream on Windows...
echo This will run in background and provide camera access to Docker containers
start "Camera Stream" python camera-host-stream.py

echo.
echo [3/4] Waiting for camera stream to initialize...
timeout /t 5 /nobreak

echo.
echo [4/4] Starting Docker containers...
docker-compose up --build

echo.
echo ====================================================
echo  System started successfully!
echo  - Frontend: http://localhost:80 or http://localhost:8080
echo  - Backend API: http://localhost:5000
echo  - Camera Stream: http://localhost:8554
echo  - Redis DB: localhost:6379
echo ====================================================
