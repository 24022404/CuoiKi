1. Cập nhật README.md với thông tin Docker Hub
## Docker Hub Repository

- **Backend**: https://hub.docker.com/r/nguyenducminh24022404/customer-analytics-backend
- **Frontend**: https://hub.docker.com/r/nguyenducminh24022404/customer-analytics-frontend

## Hướng dẫn cho Thầy/Cô chạy hệ thống

### Bước 1: Clone repository
```bash
git clone [your-github-url]
cd "Hệ thống đếm và phân loại khách hàng trong cửa hàng"

Bước 2: Pull images từ Docker Hub (tùy chọn)
docker pull nguyenducminh24022404/customer-analytics-backend
docker pull nguyenducminh24022404/customer-analytics-frontend

Bước 3: Chạy hệ thống
# Terminal 1: Camera stream (Windows host)
python camera-host-stream.py

# Terminal 2: Docker containers
docker-compose up -d

Bước 4: Truy cập
Giao diện chính: http://localhost
Admin dashboard: http://localhost/admin.html
Đăng nhập: admin123 (admin) hoặc staff456 (staff)

### 2. **Test deployment hoàn chỉnh**
```bash
# Xóa images local để test
docker rmi nguyenducminh24022404/customer-analytics-backend
docker rmi nguyenducminh24022404/customer-analytics-frontend

# Test pull từ Docker Hub
docker-compose up -d
3. Commit và push code lên GitHub
4. Tạo script dễ dàng cho thầy cô (khuyến nghị)
Tạo file start-for-teacher.bat:
@echo off
echo Khởi động hệ thống Customer Analytics...
echo.
echo Bước 1: Khởi động camera stream...
start "Camera Stream" python camera-host-stream.py
timeout /t 3
echo.
echo Bước 2: Khởi động Docker containers...
docker-compose up -d
echo.
echo Hệ thống đã sẵn sàng tại:
echo - Giao diện chính: http://localhost
echo - Admin: http://localhost/admin.html
pause

Theo yêu cầu đề bài:
✅ Đã đạt yêu cầu:
Chức năng (4đ): AI face detection + customer analytics ✅
Triển khai Docker (3đ): Docker Hub + docker-compose ✅
Giao diện (1đ): Frontend user + admin ✅
⚠️ Cần hoàn thiện:
Tài liệu (2đ): README cần bổ sung thông tin Docker Hub
Sau khi hoàn thành 4 bước trên thì dự án sẽ 100% xong và sẵn sàng nộp!