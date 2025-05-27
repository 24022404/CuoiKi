@echo off
echo ====================================================
echo  DEPLOYING TO DOCKER HUB - Customer Analytics System
echo ====================================================
echo.

REM Thay YOUR_DOCKERHUB_USERNAME bằng username thực của bạn
set DOCKER_USERNAME=nguyenducminh24022404

echo [1/6] Logging in to Docker Hub...
docker login

echo.
echo [2/6] Building backend image...
docker build -t nguyenducminh24022404/customer-analytics-backend ./backend

echo.
echo [3/6] Building frontend image...
docker build -t nguyenducminh24022404/customer-analytics-frontend ./frontend

echo.
echo [4/6] Pushing backend to Docker Hub...
docker push nguyenducminh24022404/customer-analytics-backend

echo.
echo [5/6] Pushing frontend to Docker Hub...
docker push nguyenducminh24022404/customer-analytics-frontend

echo.
echo [6/6] Updating docker-compose.yml with Docker Hub images...
echo Please manually update docker-compose.yml with these image names:
echo   - nguyenducminh24022404/customer-analytics-backend
echo   - nguyenducminh24022404/customer-analytics-frontend

echo.
echo ====================================================
echo  DEPLOYMENT COMPLETED!
echo  Docker Hub repositories:
echo  - https://hub.docker.com/r/nguyenducminh24022404/customer-analytics-backend
echo  - https://hub.docker.com/r/nguyenducminh24022404/customer-analytics-frontend
echo ====================================================
pause