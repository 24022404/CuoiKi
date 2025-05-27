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

Bước 3: Chạy hệ thống, chạy theo thứ tự terminal 1 trước rồi mới đến terminal 2
# Terminal 1: Camera stream (Windows host)
python camera-host-stream.py

# Terminal 2: Docker containers
docker-compose up -d

Bước 4: Truy cập
Giao diện chính: http://localhost
Admin dashboard: http://localhost/admin.html
Đăng nhập: ADMIN (admin) hoặc NHANVIEN (staff)

